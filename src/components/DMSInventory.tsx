import React, { useState, useMemo } from 'react';
import { Card } from '../types';  // 我们需要创建一个类型文件

interface DMSInventoryProps {
  data: Card[];
  displayFields: readonly string[];  // 添加这个属性
}

const DMSInventory: React.FC<DMSInventoryProps> = ({ data, displayFields }) => {
  const [ucmStatusFilter, setUcmStatusFilter] = useState<string>('All');
  const [webUIStatusFilter, setWebUIStatusFilter] = useState<string>('All');
  const [campaignFilter, setCampaignFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 获取所有可能的过滤选项
  const filterOptions = useMemo(() => ({
    ucmStatus: ['All', ...Array.from(new Set(data.map(item => item['UCM status'])))],
    webUIStatus: ['All', ...Array.from(new Set(data.map(item => item['WebUI status'])))],
    campaign: ['All', ...Array.from(new Set(data.map(item => item.Campaign)))]
  }), [data]);

  // 过滤数据
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchUCMStatus = ucmStatusFilter === 'All' || item['UCM status'] === ucmStatusFilter;
      const matchWebUIStatus = webUIStatusFilter === 'All' || item['WebUI status'] === webUIStatusFilter;
      const matchCampaign = campaignFilter === 'All' || item.Campaign === campaignFilter;
      const matchSearch = !searchTerm || 
        Object.values(item).some(value => 
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );

      return matchUCMStatus && matchWebUIStatus && matchCampaign && matchSearch;
    });
  }, [data, ucmStatusFilter, webUIStatusFilter, campaignFilter, searchTerm]);

  return (
    <div style={{ padding: '20px' }}>
      {/* 过滤器区域 */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        alignItems: 'flex-end'
      }}>
        {/* 搜索框 */}
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in all columns..."
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              height: '32px'
            }}
          />
        </div>

        {/* UCM Status 过滤器 */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
            UCM Status
          </label>
          <select
            value={ucmStatusFilter}
            onChange={(e) => setUcmStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              height: '32px'
            }}
          >
            {filterOptions.ucmStatus.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* WebUI Status 过滤器 */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
            WebUI Status
          </label>
          <select
            value={webUIStatusFilter}
            onChange={(e) => setWebUIStatusFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              height: '32px'
            }}
          >
            {filterOptions.webUIStatus.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* Campaign 过滤器 */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666' }}>
            Campaign
          </label>
          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              height: '32px'
            }}
          >
            {filterOptions.campaign.map(campaign => (
              <option key={campaign} value={campaign}>{campaign}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 表格区域 */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '13px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              {displayFields.map(field => (
                <th key={field} style={tableHeaderStyle}>{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                {displayFields.map(field => (
                  <td key={field} style={tableCellStyle}>{item[field]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  borderBottom: '2px solid #ddd',
  fontWeight: 'bold'
};

const tableCellStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left'
};

export default DMSInventory; 