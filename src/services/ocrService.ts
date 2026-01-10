import axios from 'axios';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

export interface OCRResult {
  success: boolean;
  amount?: number;
  rawText?: string;
  error?: string;
}

export class OCRService {
  async processSlip(imagePath: string): Promise<OCRResult> {
    try {
      if (process.env.SLIP_OK_KEY || process.env.SLIP_OK_ENDPOINT) {
        return await this.processWithSlipOk(imagePath);
      }

      if (process.env.TESSERACT_ENABLED === 'true' || process.env.TESSERACT_CMD) {
        return await this.processWithTesseract(imagePath);
      }

      // Method 1: Using Thai QR/Slip OCR API (recommended for Thai slips)
      if (process.env.OCR_API_ENDPOINT) {
        return await this.processWithAPI(imagePath);
      }

      // Method 2: Using Google Cloud Vision (if configured)
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        return await this.processWithGoogleVision(imagePath);
      }

      // Method 3: Simple text extraction fallback
      return await this.processWithSimpleExtraction(imagePath);
    } catch (error: any) {
      console.error('OCR processing error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async processWithSlipOk(imagePath: string): Promise<OCRResult> {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const apiKey = process.env.SLIP_OK_KEY || '';
    const endpoint =
      process.env.SLIP_OK_ENDPOINT ||
      (apiKey ? `https://api.slipok.com/api/line/apikey/${apiKey}` : '');

    if (!endpoint) {
      return {
        success: false,
        error: 'SLIP_OK_ENDPOINT or SLIP_OK_KEY is not configured',
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      const authHeader = process.env.SLIP_OK_AUTH_HEADER || apiKey;
      headers['x-authorization'] = authHeader;
    }

    const payload = {
      image: `data:image/jpeg;base64,${base64Image}`,
      data: base64Image,
    };

    let response;
    try {
      response = await axios.post(endpoint, payload, { headers });
    } catch (error: any) {
      const responseData = error?.response?.data;
      const detail =
        typeof responseData === 'string'
          ? responseData
          : JSON.stringify(responseData || {});
      return {
        success: false,
        error: `SlipOK error: ${detail || error.message}`,
      };
    }

    const data = response.data || {};
    const amount =
      data.amount ??
      data.data?.amount ??
      data.result?.amount ??
      data.data?.total ??
      data.result?.total;

    if (amount) {
      return {
        success: true,
        amount: parseFloat(amount),
        rawText: data.text || data.data?.text,
      };
    }

    return {
      success: false,
      error: data.message || 'Could not extract amount from slip',
      rawText: data.text || data.data?.text,
    };
  }

  private async processWithTesseract(imagePath: string): Promise<OCRResult> {
    const execFileAsync = promisify(execFile);
    const tesseractCmd = process.env.TESSERACT_CMD || 'tesseract';

    try {
      const { stdout } = await execFileAsync(
        tesseractCmd,
        [imagePath, 'stdout', '-l', 'tha+eng'],
        { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
      );

      const text = stdout || '';
      const amount = this.extractAmountFromText(text);

      if (amount) {
        return {
          success: true,
          amount,
          rawText: text,
        };
      }

      return {
        success: false,
        rawText: text,
        error: 'Could not extract amount from slip',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tesseract OCR failed',
      };
    }
  }

  private async processWithAPI(imagePath: string): Promise<OCRResult> {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(
      process.env.OCR_API_ENDPOINT!,
      {
        image: base64Image,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OCR_API_KEY}`,
        },
      }
    );

    if (response.data.success && response.data.amount) {
      return {
        success: true,
        amount: parseFloat(response.data.amount),
        rawText: response.data.text,
      };
    }

    return {
      success: false,
      error: 'Could not extract amount from slip',
    };
  }

  private async processWithGoogleVision(imagePath: string): Promise<OCRResult> {
    // This is a placeholder - you'll need to install @google-cloud/vision
    // and implement the actual Google Cloud Vision logic
    // npm install @google-cloud/vision

    /*
    const vision = require('@google-cloud/vision');
    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;

    if (detections && detections.length > 0) {
      const text = detections[0].description;
      const amount = this.extractAmountFromText(text);

      if (amount) {
        return {
          success: true,
          amount,
          rawText: text,
        };
      }
    }
    */

    return {
      success: false,
      error: 'Google Vision not configured',
    };
  }

  private async processWithSimpleExtraction(imagePath: string): Promise<OCRResult> {
    // This is a very basic fallback - in production you should use a proper OCR service
    // For MVP, you might want to just return manual entry
    return {
      success: false,
      error: 'OCR service not configured. Please enter amount manually.',
    };
  }

  private extractAmountFromText(text: string): number | null {
    // Common patterns for Thai bank slips
    const patterns = [
      /จำนวนเงิน[:\s]*([0-9,]+\.?[0-9]*)/i,
      /amount[:\s]*([0-9,]+\.?[0-9]*)/i,
      /THB[:\s]*([0-9,]+\.?[0-9]*)/i,
      /บาท[:\s]*([0-9,]+\.?[0-9]*)/i,
      /([0-9,]+\.?[0-9]*)[:\s]*บาท/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    // Fallback: find any number that looks like a monetary amount
    const numbers = text.match(/[0-9,]+\.?[0-9]{0,2}/g);
    if (numbers) {
      for (const num of numbers) {
        const amount = parseFloat(num.replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0 && amount < 1000000) {
          return amount;
        }
      }
    }

    return null;
  }
}

export default new OCRService();
