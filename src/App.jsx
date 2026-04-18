import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, TrendingUp, Users, Shield, Award } from 'lucide-react';
import './App.css';

function App() {
  const [highValue, setHighValue] = useState([]);
  const [rcmList, setRcmList] = useState([]);
  const [dcmList, setDcmList] = useState([]);
  const [cseList, setCseList] = useState([]);
  const [presidentList, setPresidentList] = useState([]);
  const [managingPartnerList, setManagingPartnerList] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [globalPlazaFilter, setGlobalPlazaFilter] = useState('');

  const toNumber = (val) => {
    if (!val) return 0;
    return Number(String(val).replace(/,/g, '').trim());
  };

  // Get all unique plazas from all lists
  const allPlazas = [...new Set([
    ...highValue.map(row => row.Plaza),
    ...rcmList.map(row => row.Plaza),
    ...dcmList.map(row => row.Plaza),
    ...cseList.map(row => row.Plaza),
    ...presidentList.map(row => row.Plaza),
    ...managingPartnerList.map(row => row.Plaza)
  ].filter(Boolean))].sort();

  // Apply global filter to all lists
  const filterByPlaza = (data) => {
    return globalPlazaFilter 
      ? data.filter(row => row.Plaza && row.Plaza.toLowerCase().includes(globalPlazaFilter.toLowerCase()))
      : data;
  };

  const filteredHighValue = filterByPlaza(highValue);
  const filteredRcmList = filterByPlaza(rcmList);
  const filteredDcmList = filterByPlaza(dcmList);
  const filteredCseList = filterByPlaza(cseList);
  const filteredPresidentList = filterByPlaza(presidentList);
  const filteredManagingPartnerList = filterByPlaza(managingPartnerList);

  const totalRecords = filteredHighValue.length + filteredRcmList.length + filteredDcmList.length + filteredCseList.length + filteredPresidentList.length + filteredManagingPartnerList.length;

  const handleFileRead = (file) => {
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const high = [], rcm = [], dcm = [], cse = [], president = [], managingPartner = [];

      rows.forEach((row) => {
        const plaza = row[3];
        const account = row[5];
        const category = row[6];
        const customer = row[7];
        const mobile = row[8];
        const saleDate = row[12];
        const down = row[17];
        const mrp = row[20];

        if (!account || account === 'Account No.') return;

        const mrpNum = toNumber(mrp);
        const downNum = toNumber(down);
        const diff = mrpNum - downNum;

        // Parse sale date - handle various date formats
        let saleDateObj = null;
        if (saleDate) {
          if (typeof saleDate === 'number') {
            // Excel serial date
            saleDateObj = new Date((saleDate - 25569) * 86400 * 1000);
          } else if (typeof saleDate === 'string') {
            // Try parsing string date
            saleDateObj = new Date(saleDate);
          } else if (saleDate instanceof Date) {
            saleDateObj = saleDate;
          }
        }

        // Cutoff date: 01-Apr-26
        const cutoffDate = new Date('2026-04-01');
        const isNewLogic = saleDateObj && saleDateObj >= cutoffDate;

        const record = {
          Plaza: plaza,
          Account: account,
          Category: category,
          Customer: customer,
          Mobile: mobile,
          SaleDate: saleDateObj ? saleDateObj.toLocaleDateString('en-GB') : saleDate,
          MRP: mrpNum,
          Down: downNum,
          Difference: diff,
        };

        // Cheque Requirment List (same for both logics)
        if (diff >= 75000) high.push(record);

        // Apply approval hierarchy based on sale date
        if (isNewLogic) {
          // New Logic (from 01-Apr-26)
          if (mrpNum > 80000 && mrpNum < 150000) rcm.push(record);
          else if (mrpNum >= 150000 && mrpNum < 300000) dcm.push(record);
          else if (mrpNum >= 300000 && mrpNum < 500000) cse.push(record);
          else if (mrpNum >= 500000 && mrpNum < 1000000) president.push(record);
          else if (mrpNum >= 1000000) managingPartner.push(record);
        } else {
          // Previous Logic (before 01-Apr-26)
          if (mrpNum > 80000 && mrpNum < 200000) rcm.push(record);
          else if (mrpNum >= 200000 && mrpNum < 500000) dcm.push(record);
          else if (mrpNum >= 500000) cse.push(record);
        }
      });

      setHighValue(high);
      setRcmList(rcm);
      setDcmList(dcm);
      setCseList(cse);
      setPresidentList(president);
      setManagingPartnerList(managingPartner);
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const processFile = (e) => {
    const file = e.target.files[0];
    handleFileRead(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      handleFileRead(file);
    }
  };

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(highValue), 'High Value');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rcmList), 'RCM-RSM');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dcmList), 'DCM-CDO');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cseList), 'CSE-HOC');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(presidentList), 'President-PMF');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(managingPartnerList), 'Managing-Partner');
    XLSX.writeFile(wb, 'Approval_Lists.xlsx');
  };

  const DataSection = ({ title, count, icon: Icon, color, data }) => {
    return (
      <div className={`data-section ${color}`}>
        <div className="section-header">
          <div className="section-title">
            <Icon size={28} />
            <h2>{title}</h2>
            <span className="count-badge">{data.length}</span>
          </div>
        </div>
        {data.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Plaza</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>Sale Date</th>
                  <th>MRP</th>
                  <th>Down Payment</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Plaza}</td>
                    <td>{row.Account}</td>
                    <td>{row.Category}</td>
                    <td>{row.Customer}</td>
                    <td>{row.Mobile}</td>
                    <td>{row.SaleDate}</td>
                    <td>{row.MRP.toLocaleString()}</td>
                    <td>{row.Down.toLocaleString()}</td>
                    <td className="difference">{row.Difference.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.length === 0 && (
          <div className="empty-state">No records found for selected plaza</div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <FileSpreadsheet size={40} />
          <h1>Hire Sales Cheque Requirment and Approval Checker</h1>
          <p>Automated approval workflow management</p>
          <div className="instruction-box">
            <p>POS এ লগিন করে - Sales &gt; Reports &gt; Credit Recovery &gt; Hire Sales & Collection Report ডাউনলোড করে আপলোড করেন।</p>
          </div>
        </div>
      </div>

      <div 
        className={`upload-section ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="upload-area">
          <Upload size={32} />
          <h3>Drop your Excel file here</h3>
          <p>or</p>
          <label htmlFor="file-upload" className="upload-button">
            <Upload size={20} />
            {fileName || 'Browse Files'}
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".xls,.xlsx"
            onChange={processFile}
            style={{ display: 'none' }}
          />
          <span className="file-info">Supports .xls and .xlsx files</span>
        </div>
        
        {(highValue.length > 0 || rcmList.length > 0 || dcmList.length > 0 || cseList.length > 0 || presidentList.length > 0 || managingPartnerList.length > 0) && (
          <button className="download-button" onClick={downloadExcel}>
            <Download size={20} />
            Download All Lists
          </button>
        )}
      </div>

      {isProcessing && (
        <div className="loading">Processing your file...</div>
      )}

      {totalRecords > 0 && (
        <div className="dashboard">
          <div className="dashboard-card">
            <div className="dashboard-icon red">
              <TrendingUp size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">Cheque Requirment</span>
              <span className="dashboard-value">{filteredHighValue.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon blue">
              <Users size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">RCM / RSM</span>
              <span className="dashboard-value">{filteredRcmList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon green">
              <Shield size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">DCM / CDO</span>
              <span className="dashboard-value">{filteredDcmList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon purple">
              <Award size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">CSE / HOC</span>
              <span className="dashboard-value">{filteredCseList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon orange">
              <Shield size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">President PMF</span>
              <span className="dashboard-value">{filteredPresidentList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon teal">
              <Award size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">Managing Partner</span>
              <span className="dashboard-value">{filteredManagingPartnerList.length}</span>
            </div>
          </div>
          <div className="dashboard-card total">
            <div className="dashboard-icon dark">
              <FileSpreadsheet size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">Total Records</span>
              <span className="dashboard-value">{totalRecords}</span>
            </div>
          </div>
        </div>
      )}

      {(highValue.length > 0 || rcmList.length > 0 || dcmList.length > 0 || cseList.length > 0 || presidentList.length > 0 || managingPartnerList.length > 0) && (
        <div className="global-filter-container">
          <label htmlFor="global-plaza-filter" className="filter-label">
            Filter by Plaza (applies to all sections):
          </label>
          <select 
            id="global-plaza-filter"
            value={globalPlazaFilter} 
            onChange={(e) => setGlobalPlazaFilter(e.target.value)}
            className="global-plaza-filter"
          >
            <option value="">All Plazas</option>
            {allPlazas.map(plaza => (
              <option key={plaza} value={plaza}>{plaza}</option>
            ))}
          </select>
          {globalPlazaFilter && (
            <button 
              className="clear-filter-btn"
              onClick={() => setGlobalPlazaFilter('')}
            >
              Clear Filter
            </button>
          )}
        </div>
      )}

      <div className="sections-container">
        <DataSection
          title="Cheque Requirment List"
          count={filteredHighValue.length}
          icon={TrendingUp}
          color="section-red"
          data={filteredHighValue}
        />
        <DataSection
          title="RCM / RSM Approval"
          count={filteredRcmList.length}
          icon={Users}
          color="section-blue"
          data={filteredRcmList}
        />
        <DataSection
          title="DCM / CDO Approval"
          count={filteredDcmList.length}
          icon={Shield}
          color="section-green"
          data={filteredDcmList}
        />
        <DataSection
          title="CSE / HOC Approval"
          count={filteredCseList.length}
          icon={Award}
          color="section-purple"
          data={filteredCseList}
        />
        <DataSection
          title="President of PMF with two Member Approval"
          count={filteredPresidentList.length}
          icon={Shield}
          color="section-orange"
          data={filteredPresidentList}
        />
        <DataSection
          title="Managing Partner Approval"
          count={filteredManagingPartnerList.length}
          icon={Award}
          color="section-teal"
          data={filteredManagingPartnerList}
        />
      </div>
    </div>
  );
}

export default App;
