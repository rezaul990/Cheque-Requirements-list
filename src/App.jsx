import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, TrendingUp, Users, Shield, Award } from 'lucide-react';
import './App.css';

function App() {
  const [highValue, setHighValue] = useState([]);
  const [rcmList, setRcmList] = useState([]);
  const [dcmList, setDcmList] = useState([]);
  const [cseList, setCseList] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const toNumber = (val) => {
    if (!val) return 0;
    return Number(String(val).replace(/,/g, '').trim());
  };

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

      const high = [], rcm = [], dcm = [], cse = [];

      rows.forEach((row) => {
        const plaza = row[3];
        const account = row[5];
        const category = row[6];
        const customer = row[7];
        const mobile = row[8];
        const down = row[17];
        const mrp = row[20];

        if (!account || account === 'Account No.') return;

        const mrpNum = toNumber(mrp);
        const downNum = toNumber(down);
        const diff = mrpNum - downNum;

        const record = {
          Plaza: plaza,
          Account: account,
          Category: category,
          Customer: customer,
          Mobile: mobile,
          MRP: mrpNum,
          Down: downNum,
          Difference: diff,
        };

        if (diff >= 75000) high.push(record);

        if (mrpNum > 80000 && mrpNum < 200000) rcm.push(record);
        else if (mrpNum >= 200000 && mrpNum < 500000) dcm.push(record);
        else if (mrpNum >= 500000) cse.push(record);
      });

      setHighValue(high);
      setRcmList(rcm);
      setDcmList(dcm);
      setCseList(cse);
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
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cseList), 'CSE');
    XLSX.writeFile(wb, 'Approval_Lists.xlsx');
  };

  const DataSection = ({ title, count, icon: Icon, color, data }) => {
    const [plazaFilter, setPlazaFilter] = useState('');
    
    const filteredData = plazaFilter 
      ? data.filter(row => row.Plaza && row.Plaza.toLowerCase().includes(plazaFilter.toLowerCase()))
      : data;

    const uniquePlazas = [...new Set(data.map(row => row.Plaza).filter(Boolean))].sort();

    return (
      <div className={`data-section ${color}`}>
        <div className="section-header">
          <div className="section-title">
            <Icon size={28} />
            <h2>{title}</h2>
            <span className="count-badge">{filteredData.length}</span>
          </div>
          {data.length > 0 && (
            <div className="filter-container">
              <select 
                value={plazaFilter} 
                onChange={(e) => setPlazaFilter(e.target.value)}
                className="plaza-filter"
              >
                <option value="">All Plazas ({count})</option>
                {uniquePlazas.map(plaza => (
                  <option key={plaza} value={plaza}>{plaza}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {filteredData.length > 0 && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Plaza</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th>MRP</th>
                  <th>Down Payment</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.Plaza}</td>
                    <td>{row.Account}</td>
                    <td>{row.Category}</td>
                    <td>{row.Customer}</td>
                    <td>{row.Mobile}</td>
                    <td>{row.MRP.toLocaleString()}</td>
                    <td>{row.Down.toLocaleString()}</td>
                    <td className="difference">{row.Difference.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filteredData.length === 0 && data.length > 0 && (
          <div className="empty-state">No records found for selected plaza</div>
        )}
        {data.length === 0 && (
          <div className="empty-state">No records found</div>
        )}
      </div>
    );
  };

  const totalRecords = highValue.length + rcmList.length + dcmList.length + cseList.length;

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
        
        {(highValue.length > 0 || rcmList.length > 0 || dcmList.length > 0 || cseList.length > 0) && (
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
              <span className="dashboard-value">{highValue.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon blue">
              <Users size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">RCM / RSM</span>
              <span className="dashboard-value">{rcmList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon green">
              <Shield size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">DCM / CDO</span>
              <span className="dashboard-value">{dcmList.length}</span>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-icon purple">
              <Award size={24} />
            </div>
            <div className="dashboard-info">
              <span className="dashboard-label">CSE Approval</span>
              <span className="dashboard-value">{cseList.length}</span>
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

      <div className="sections-container">
        <DataSection
          title="Cheque Requirment List"
          count={highValue.length}
          icon={TrendingUp}
          color="section-red"
          data={highValue}
        />
        <DataSection
          title="RCM / RSM Approval"
          count={rcmList.length}
          icon={Users}
          color="section-blue"
          data={rcmList}
        />
        <DataSection
          title="DCM / CDO Approval"
          count={dcmList.length}
          icon={Shield}
          color="section-green"
          data={dcmList}
        />
        <DataSection
          title="CSE Approval"
          count={cseList.length}
          icon={Award}
          color="section-purple"
          data={cseList}
        />
      </div>
    </div>
  );
}

export default App;
