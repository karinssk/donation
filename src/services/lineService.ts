import { Client, FlexMessage, FlexBubble, FlexBox, MessageAPIResponseBase } from '@line/bot-sdk';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
};

export class LineService {
  private client: Client;

  constructor() {
    this.client = new Client(config);
  }

  async replyMessage(replyToken: string, messages: any[]): Promise<MessageAPIResponseBase> {
    return this.client.replyMessage(replyToken, messages);
  }

  async pushMessage(to: string, messages: any[]): Promise<MessageAPIResponseBase> {
    return this.client.pushMessage(to, messages);
  }

  async getProfile(userId: string) {
    return this.client.getProfile(userId);
  }

  async getGroupSummary(groupId: string) {
    return this.client.getGroupSummary(groupId);
  }

  async getMessagingQuotaRemaining(): Promise<{ limit: number; used: number; remaining: number }> {
    const headers = {
      Authorization: `Bearer ${config.channelAccessToken}`,
    };
    const [quotaRes, usageRes] = await Promise.all([
      axios.get('https://api.line.me/v2/bot/message/quota', { headers }),
      axios.get('https://api.line.me/v2/bot/message/quota/consumption', { headers }),
    ]);

    const limit = Number(quotaRes.data?.value ?? 0);
    const used = Number(usageRes.data?.totalUsage ?? 0);
    const remaining = Math.max(limit - used, 0);
    return { limit, used, remaining };
  }

  async downloadImage(messageId: string, savePath: string): Promise<string> {
    const stream = await this.client.getMessageContent(messageId);
    const filePath = path.join(savePath, `${messageId}.jpg`);

    return new Promise((resolve, reject) => {
      const writable = fs.createWriteStream(filePath);
      stream.pipe(writable);
      stream.on('end', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  createProjectListFlex(projects: any[]): FlexMessage {
    const bubbles: FlexBubble[] = projects.map((project): FlexBubble => {
      const goalRow: FlexBox | null = project.goal_amount && project.goal_amount > 0
        ? {
            type: 'box',
            layout: 'baseline',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: 'เป้าหมาย',
                color: '#7E8691',
                size: 'sm',
                flex: 2,
              },
              {
                type: 'text',
                text: `${project.goal_amount.toLocaleString()} บาท`,
                wrap: true,
                color: '#1C1C1C',
                size: 'sm',
                flex: 3,
                align: 'end',
              },
            ],
          }
        : null;

      return {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: (project.name || '').trim(),
              weight: 'bold',
              size: 'lg',
              color: '#5B4E91',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: (project.description || 'ไม่มีคำอธิบาย').trim(),
              wrap: true,
              size: 'sm',
              color: '#7E8691',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'ยอดปัจจุบัน',
                      color: '#7E8691',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${project.current_amount?.toLocaleString() || 0} บาท`,
                      wrap: true,
                      color: '#17A44A',
                      size: 'sm',
                      flex: 3,
                      align: 'end',
                      weight: 'bold',
                    },
                  ],
                },
                ...(goalRow ? [goalRow] : []),
              ],
            },
          ],
          backgroundColor: '#FFFFFF',
          paddingAll: '20px',
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'postback',
                label: 'ทำบุญ',
                data: `action=select_project&project_id=${project.id}`,
              },
              color: '#17A44A',
            },
          ],
        },
      };
    });

    return {
      type: 'flex',
      altText: 'รายการโปรเจกต์บริจาค',
      contents: {
        type: 'carousel',
        contents: bubbles,
      },
    };
  }

  createOCRConfirmationFlex(
    donationId: string,
    projectName: string,
    amount: number,
    isManual: boolean = false
  ): FlexMessage {
    const bubble: FlexBubble = {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: isManual ? 'กรุณายืนยันยอดเงิน' : 'ระบบอ่านสลิปได้',
            weight: 'bold',
            size: 'lg',
            color: '#5B4E91',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `โปรเจกต์: ${(projectName || '').trim()}`,
            wrap: true,
            size: 'md',
            margin: 'md',
            color: '#7E8691',
          },
          {
            type: 'text',
            text: `ยอดรวม: ${amount.toLocaleString()} บาท`,
            wrap: true,
            size: 'xl',
            weight: 'bold',
            color: '#17A44A',
            margin: 'md',
          },
        ],
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
      },
    };

    return {
      type: 'flex',
      altText: 'ยืนยันการบริจาค',
      contents: {
        ...bubble,
      },
    };
  }

  createSummaryFlex(
    projectName: string,
    totalAmount: number,
    donationCount: number,
    recentDonations: any[]
  ): FlexMessage {
    // Get current date and time in Thai format
    const now = new Date();
    const thaiDate = now.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const thaiTime = now.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return {
      type: 'flex',
      altText: `สรุปการบริจาควันนี้ - ${projectName}`,
      contents: {
        type: 'bubble',
        size: 'mega',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'icon',
                  url: 'https://scdn.line-apps.com/n/channel_devcenter/img/fx/receipt_icon.png',
                  size: 'md',
                },
                {
                  type: 'text',
                  text: 'รายการสรุปสลิปโอนวันนี้',
                  weight: 'bold',
                  size: 'lg',
                  color: '#5B4E91',
                  margin: 'md',
                  wrap: true,
                },
              ],
            },
            {
              type: 'text',
              text: `วันที่ ${thaiDate} เวลา ${thaiTime} น.`,
              size: 'sm',
              color: '#7E8691',
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'md',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: 'ร้าน',
                      size: 'sm',
                      color: '#7E8691',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: projectName,
                      size: 'sm',
                      color: '#1C1C1C',
                      flex: 3,
                      align: 'end',
                      wrap: true,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: 'จำนวนสลิปโอนเงิน',
                      size: 'sm',
                      color: '#7E8691',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${donationCount} รายการ`,
                      size: 'sm',
                      color: '#1C1C1C',
                      weight: 'bold',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  contents: [
                    {
                      type: 'text',
                      text: 'รวมยอดเงินทั้งหมด',
                      size: 'sm',
                      color: '#7E8691',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${totalAmount.toLocaleString()} บาท`,
                      size: 'sm',
                      color: '#17A44A',
                      weight: 'bold',
                      flex: 3,
                      align: 'end',
                    },
                  ],
                },
              ],
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'ตรวจสอบความโปร่งใส',
                uri: 'https://donation.fastforwardssl.com',
              },
              color: '#5B7FDB',
              margin: 'md',
            },
          ],
          backgroundColor: '#FFFFFF',
          paddingAll: '20px',
        },
      },
    };
  }

  createDonationThankYouFlex(
    displayName: string,
    amount: number,
    destination: string | null | undefined,
    projectName: string,
    title: string = 'ขอบคุณสำหรับการบริจาค'
  ): FlexMessage {
    const rows: any[] = [
      {
        type: 'box',
        layout: 'baseline',
        contents: [
          {
            type: 'text',
            text: 'ผู้บริจาค',
            size: 'sm',
            color: '#7E8691',
            flex: 2,
          },
          {
            type: 'text',
            text: displayName || 'ผู้บริจาค',
            size: 'sm',
            color: '#1C1C1C',
            flex: 3,
            align: 'end',
            wrap: true,
          },
        ],
      },
      {
        type: 'box',
        layout: 'baseline',
        contents: [
          {
            type: 'text',
            text: 'ยอดรวม',
            size: 'sm',
            color: '#7E8691',
            flex: 2,
          },
          {
            type: 'text',
            text: `${amount.toLocaleString()} บาท`,
            size: 'sm',
            color: '#17A44A',
            weight: 'bold',
            flex: 3,
            align: 'end',
          },
        ],
      },
    ];

    if (destination) {
      rows.push({
        type: 'box',
        layout: 'baseline',
        contents: [
          {
            type: 'text',
            text: 'ชื่อผู้รับบริจาค',
            size: 'sm',
            color: '#7E8691',
            flex: 2,
          },
          {
            type: 'text',
            text: destination,
            size: 'sm',
            color: '#1C1C1C',
            flex: 3,
            align: 'end',
            wrap: true,
          },
        ],
      });
    }

    rows.push({
      type: 'box',
      layout: 'baseline',
      contents: [
        {
          type: 'text',
          text: 'โปรเจกต์',
          size: 'sm',
          color: '#7E8691',
          flex: 2,
        },
        {
          type: 'text',
          text: projectName,
          size: 'sm',
          color: '#1C1C1C',
          flex: 3,
          align: 'end',
          wrap: true,
        },
      ],
    });

    return {
      type: 'flex',
      altText: `${title} ${amount.toLocaleString()} บาท`,
      contents: {
        type: 'bubble',
        size: 'mega',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: title,
              weight: 'bold',
              size: 'lg',
              color: '#5B4E91',
            },
            {
              type: 'text',
              text: 'สรุปรายละเอียดการบริจาค',
              size: 'sm',
              color: '#7E8691',
              margin: 'sm',
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'md',
              contents: rows,
            },
            {
              type: 'button',
              style: 'link',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'ตรวจสอบความโปร่งใส',
                uri: 'https://donation.fastforwardssl.com',
              },
              color: '#5B7FDB',
              margin: 'md',
            },
          ],
          backgroundColor: '#FFFFFF',
          paddingAll: '20px',
        },
      },
    };
  }
}

export default new LineService();
