import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './DashboardPage.css';

function DashboardPage({ onLogout }) {
  const [donations, setDonations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [savingMessage, setSavingMessage] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  useEffect(() => {
    loadProjects();
    loadDonations();
    loadThankYouMessage();
  }, []);

  const loadProjects = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  };

  const loadDonations = async (projectId = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const url = projectId
        ? `/api/admin/donations?project_id=${projectId}`
        : '/api/admin/donations';

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDonations(data.data || []);
        setError('');
      } else {
        setError('ไม่สามารถโหลดข้อมูลได้');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const loadThankYouMessage = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        const setting = (data.data || []).find(item => item.key === 'thank_you_message');
        setThankYouMessage(setting?.value || 'ขอบคุณสำหรับการบริจาค');
      }
    } catch (err) {
      console.error('Error loading thank you message:', err);
    }
  };

  const handleSaveThankYouMessage = async () => {
    try {
      setSavingMessage(true);
      setSaveStatus('');
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/admin/settings/thank_you_message', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: thankYouMessage.trim() || 'ขอบคุณสำหรับการบริจาค' }),
      });
      const data = await response.json();
      if (data.success) {
        setThankYouMessage(data.data?.value || thankYouMessage);
        setSaveStatus('บันทึกแล้ว');
      } else {
        setSaveStatus('บันทึกไม่สำเร็จ');
      }
    } catch (err) {
      setSaveStatus('บันทึกไม่สำเร็จ');
    } finally {
      setSavingMessage(false);
    }
  };

  const handleProjectFilter = (e) => {
    const projectId = e.target.value;
    setSelectedProject(projectId);
    loadDonations(projectId);
  };

  const filterDonationsByDateRange = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return donations.filter(donation => {
      const donationDate = new Date(donation.created_at);
      return donationDate >= start && donationDate <= end;
    });
  };

  const exportToCSV = () => {
    const filteredDonations = filterDonationsByDateRange();

    if (filteredDonations.length === 0) {
      alert('ไม่มีข้อมูลในช่วงวันที่ที่เลือก');
      return;
    }

    const csvData = filteredDonations.map(donation => ({
      'วันที่': new Date(donation.created_at).toLocaleString('th-TH'),
      'ผู้บริจาค': donation.is_anonymous ? 'ไม่ระบุชื่อ' : (donation.display_name || 'ผู้บริจาค'),
      'ชื่อผู้รับบริจาค': donation.project_id?.destination || '-',
      'จำนวนเงิน': donation.amount_final || 0,
      'สถานะ': donation.status,
      'LINE User ID': donation.line_user_id || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = startDate === endDate
      ? `donations_${startDate}.csv`
      : `donations_${startDate}_to_${endDate}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToXLSX = () => {
    const filteredDonations = filterDonationsByDateRange();

    if (filteredDonations.length === 0) {
      alert('ไม่มีข้อมูลในช่วงวันที่ที่เลือก');
      return;
    }

    const xlsxData = filteredDonations.map(donation => ({
      'วันที่': new Date(donation.created_at).toLocaleString('th-TH'),
      'ผู้บริจาค': donation.is_anonymous ? 'ไม่ระบุชื่อ' : (donation.display_name || 'ผู้บริจาค'),
      'ชื่อผู้รับบริจาค': donation.project_id?.destination || '-',
      'จำนวนเงิน': donation.amount_final || 0,
      'สถานะ': donation.status,
      'LINE User ID': donation.line_user_id || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(xlsxData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donations');
    const filename = startDate === endDate
      ? `donations_${startDate}.xlsx`
      : `donations_${startDate}_to_${endDate}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getTotalAmount = () => {
    return donations
      .filter(d => d.status === 'confirmed')
      .reduce((sum, d) => sum + (d.amount_final || 0), 0);
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-dot" />
          Line Donation
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item active">Dashboard</button>
        </nav>
      </aside>

      <div className="dashboard-body">
        <header className="topbar">
          <div className="search-field">
            <span className="search-icon">🔎</span>
            <input type="search" placeholder="ค้นหาอย่างรวดเร็ว" />
          </div>
          <div className="topbar-actions">
            <div className="user-chip">
              <div className="user-avatar">MJ</div>
              <div>
                <p className="user-name">Admin</p>
                <span className="user-role">Line Donation</span>
              </div>
            </div>
            <button onClick={onLogout} className="logout-btn">ออกจากระบบ</button>
          </div>
        </header>

        <div className="dashboard-content">
          <div className="page-header">
            <div>
              <h1>Admin Panel</h1>
              <p>ภาพรวมรายการบริจาคทั้งหมดในระบบ</p>
            </div>
            <div className="header-highlight">
              <span>ยอดเงินรวม</span>
              <strong>{getTotalAmount().toLocaleString()} บาท</strong>
            </div>
          </div>

          <div className="stats-cards">
            <div className="stat-card">
              <h3>รายการบริจาคทั้งหมด</h3>
              <p className="stat-number">{donations.length}</p>
            </div>
            <div className="stat-card">
              <h3>ยอดเงินรวม</h3>
              <p className="stat-number">{getTotalAmount().toLocaleString()} บาท</p>
            </div>
            <div className="stat-card">
              <h3>รายการที่ยืนยันแล้ว</h3>
              <p className="stat-number">
                {donations.filter(d => d.status === 'confirmed').length}
              </p>
            </div>
          </div>

        <div className="controls">
          <div className="filter-group">
              <label>กรองตามโปรเจกต์:</label>
              <select value={selectedProject} onChange={handleProjectFilter}>
                <option value="">ทั้งหมด</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="date-range-group">
              <label>ช่วงวันที่ Export:</label>
              <div className="date-inputs">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                />
                <span>ถึง</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
                <button
                  onClick={() => {
                    const today = getTodayDate();
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className="today-btn"
                >
                  วันนี้
                </button>
              </div>
          </div>

          <div className="export-buttons">
              <button onClick={exportToCSV} className="export-btn csv-btn">
                📊 Export CSV
              </button>
              <button onClick={exportToXLSX} className="export-btn xlsx-btn">
                📈 Export XLSX
              </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="settings-header">
            <div>
              <h3>ข้อความขอบคุณหลังยืนยันยอด</h3>
              <p>แก้ไขข้อความที่แสดงบนการ์ดขอบคุณผู้บริจาค</p>
            </div>
            {saveStatus && <span className="save-status">{saveStatus}</span>}
          </div>
          <div className="settings-body">
            <input
              type="text"
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              placeholder="ขอบคุณสำหรับการบริจาค"
            />
            <button
              className="save-btn"
              onClick={handleSaveThankYouMessage}
              disabled={savingMessage}
            >
              {savingMessage ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

          {loading ? (
            <div className="loading">กำลังโหลดข้อมูล...</div>
          ) : (
            <div className="table-container">
              <table className="donations-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>ผู้บริจาค</th>
                    <th>ชื่อผู้รับบริจาค</th>
                    <th>จำนวนเงิน</th>
                    <th>สถานะ</th>
                    <th>LINE User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">ไม่มีข้อมูล</td>
                    </tr>
                  ) : (
                    donations.map(donation => (
                      <tr key={donation._id}>
                        <td>{new Date(donation.created_at).toLocaleString('th-TH')}</td>
                        <td>
                          {donation.is_anonymous
                            ? 'ไม่ระบุชื่อ'
                            : (donation.display_name || 'ผู้บริจาค')}
                        </td>
                        <td>{donation.project_id?.destination || '-'}</td>
                        <td className="amount">
                          {(donation.amount_final || 0).toLocaleString()} บาท
                        </td>
                        <td>
                          <span className={`status-badge status-${donation.status}`}>
                            {donation.status}
                          </span>
                        </td>
                        <td className="user-id">{donation.line_user_id || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
