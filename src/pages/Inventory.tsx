import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../types';

// 定义状态类型
type FilterState = 'Yes' | 'No' | 'All';

// 修改状态定义
interface EligibilityState {
  Search: FilterState;
  Pmax: FilterState;
  Shopping: FilterState;
  DNV: FilterState;
}

// 添加新的状态类型定义
interface ApplyToTypeState {
  New: FilterState;
  Existing: FilterState;
}

// 添加新的状态类型定义
interface AlreadyApplyState {
  Search: FilterState;
  Pmax: FilterState;
  Shopping: FilterState;
  DNV: FilterState;
}

interface InventoryProps {
  title?: string;
  showDetails?: boolean;
  showNavigation?: boolean;  // 添加新属性
}

const Inventory: React.FC<InventoryProps> = ({ 
  title = "DMS Inventory",
  showDetails = true,
  showNavigation = false
}) => {
  const [data, setData] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [selectedEligibility, setSelectedEligibility] = useState<string[]>(['Can apply to Search campaign']);
  const [selectedAlreadyApply, setSelectedAlreadyApply] = useState<string[]>([]);
  const [selectedCampaignLevel, setSelectedCampaignLevel] = useState<string[]>(['Yes']);
  const [selectedUCMDMS, setSelectedUCMDMS] = useState<string[]>(['Yes']);
  const [selectedWebUIStatus, setSelectedWebUIStatus] = useState<string[]>(['All']);
  const [applyToTypeState, setApplyToTypeState] = useState<ApplyToTypeState>({
    New: 'All',
    Existing: 'All'
  });
  const [eligibilityState, setEligibilityState] = useState<EligibilityState>({
    Search: 'All',
    Pmax: 'All',
    Shopping: 'All',
    DNV: 'All'
  });
  const [alreadyApplyState, setAlreadyApplyState] = useState<AlreadyApplyState>({
    Search: 'All',
    Pmax: 'All',
    Shopping: 'All',
    DNV: 'All'
  });
  const [showAllColumns, setShowAllColumns] = useState(false);

  // 修改这个数组的顺序
  const defaultColumns = [
    'Pillar',
    'Category',
    'Item',
    'UCM DMS Weightage',
    'Tactic code',
    'Recommendation',
    'Notes about UI availability',
    'Notes about applicable level',
    'Notes about campaign type coverage'
  ];

  // 提取所有不重复的 Owner GPM
  const ownerGPMs = useMemo(() => {
    const owners = new Set(data.map(item => item['Owner GPM']));
    return Array.from(owners).filter(Boolean).sort();
  }, [data]);

  // 修改过滤数据逻辑
  const filteredData = useMemo(() => {
    let filtered = data;
    
    // 按 Owner GPM 过滤
    if (selectedOwners.length) {
      filtered = filtered.filter(item => selectedOwners.includes(item['Owner GPM']));
    }
    
    // 修改 UCM DMS 过滤逻辑
    if (selectedUCMDMS.length && !selectedUCMDMS.includes('All')) {
      filtered = filtered.filter(item => {
        if (selectedUCMDMS.includes('Yes')) {
          return item['UCM status'] === 'Included in UCM DMS';
        }
        if (selectedUCMDMS.includes('No')) {
          return item['UCM status'] !== 'Included in UCM DMS';
        }
        return true;
      });
    }
    
    // 修改 Eligibility 过滤逻辑
    filtered = filtered.filter(item => {
      // 检查 Search campaign
      if (eligibilityState.Search === 'Yes') {
        if (item['Can apply to Search campaign'] !== 'Can apply to Search campaign') return false;
      } else if (eligibilityState.Search === 'No') {
        if (item['Can apply to Search campaign'] !== '-') return false;
      }

      // 检查 Pmax campaign
      if (eligibilityState.Pmax === 'Yes') {
        if (item['Can apply to Pmax campaign'] !== 'Can apply to Pmax campaign') return false;
      } else if (eligibilityState.Pmax === 'No') {
        if (item['Can apply to Pmax campaign'] !== '-') return false;
      }

      // 检查 Shopping campaign
      if (eligibilityState.Shopping === 'Yes') {
        if (item['Can apply to Shopping campaign'] !== 'Can apply to Shopping campaign') return false;
      } else if (eligibilityState.Shopping === 'No') {
        if (item['Can apply to Shopping campaign'] !== '-') return false;
      }

      // 检查 DNV campaign
      if (eligibilityState.DNV === 'Yes') {
        if (item['Can apply to DNV campaign'] !== 'Can apply to DNV campaign') return false;
      } else if (eligibilityState.DNV === 'No') {
        if (item['Can apply to DNV campaign'] !== '-') return false;
      }

      return true;
    });
    
    // 添加 Already apply to 过滤逻辑
    if (selectedAlreadyApply.length) {
      filtered = filtered.filter(item => 
        selectedAlreadyApply.every(type => 
          item[`Already apply to ${type}`] === 'Already apply to Search campaign' ||
          item[`Already apply to ${type}`] === 'Already apply to Pmax campaign' ||
          item[`Already apply to ${type}`] === 'Already apply to Shopping campaign' ||
          item[`Already apply to ${type}`] === 'Already apply to DNV campaign'
        )
      );
    }
    
    // 修改 Campaign Level 过滤逻辑
    if (selectedCampaignLevel.length && !selectedCampaignLevel.includes('All')) {
      filtered = filtered.filter(item => {
        if (selectedCampaignLevel.includes('Yes')) {
          return item['Can apply to campaign level'] === 'Can apply to campaign level';
        }
        if (selectedCampaignLevel.includes('No')) {
          return item['Can apply to campaign level'] !== 'Can apply to campaign level';
        }
        return true;
      });
    }
    
    // 修改 Web UI readiness 过滤逻辑
    if (selectedWebUIStatus.length && !selectedWebUIStatus.includes('All')) {
      filtered = filtered.filter(item => {
        if (selectedWebUIStatus.includes('Ready')) {
          return item['WebUI status'] === 'WebUI Ready';
        }
        if (selectedWebUIStatus.includes('Partially Ready')) {
          return item['WebUI status'] === 'WebUI Partially Ready';
        }
        if (selectedWebUIStatus.includes('Not Ready')) {
          return item['WebUI status'] === 'WebUI Not Ready';
        }
        return true;
      });
    }
    
    // 修改 Can apply to new/existing campaign 过滤逻辑
    filtered = filtered.filter(item => {
      // 检查 New campaign
      if (applyToTypeState.New === 'Yes') {
        if (item['Can apply to new campaign'] !== 'Can apply to new campaign') return false;
      } else if (applyToTypeState.New === 'No') {
        if (item['Can apply to new campaign'] !== '-') return false;
      }

      // 检查 Existing campaign
      if (applyToTypeState.Existing === 'Yes') {
        if (item['Can apply to existing campaign'] !== 'Can apply to existing campaign') return false;
      } else if (applyToTypeState.Existing === 'No') {
        if (item['Can apply to existing campaign'] !== '-') return false;
      }

      return true;
    });
    
    // 修改 Already apply to 过滤逻辑
    filtered = filtered.filter(item => {
      // 检查 Search campaign
      if (alreadyApplyState.Search === 'Yes') {
        if (item['Already apply to Search campaign'] !== 'Already apply to Search campaign') return false;
      } else if (alreadyApplyState.Search === 'No') {
        if (item['Already apply to Search campaign'] !== '-') return false;
      }

      // 检查 Pmax campaign
      if (alreadyApplyState.Pmax === 'Yes') {
        if (item['Already apply to Pmax campaign'] !== 'Already apply to Pmax campaign') return false;
      } else if (alreadyApplyState.Pmax === 'No') {
        if (item['Already apply to Pmax campaign'] !== '-') return false;
      }

      // 检查 Shopping campaign
      if (alreadyApplyState.Shopping === 'Yes') {
        if (item['Already apply to Shopping campaign'] !== 'Already apply to Shopping campaign') return false;
      } else if (alreadyApplyState.Shopping === 'No') {
        if (item['Already apply to Shopping campaign'] !== '-') return false;
      }

      // 检查 DNV campaign
      if (alreadyApplyState.DNV === 'Yes') {
        if (item['Already apply to DNV campaign'] !== 'Already apply to DNV campaign') return false;
      } else if (alreadyApplyState.DNV === 'No') {
        if (item['Already apply to DNV campaign'] !== '-') return false;
      }

      return true;
    });
    
    return filtered;
  }, [data, selectedOwners, selectedUCMDMS, eligibilityState, selectedAlreadyApply, selectedCampaignLevel, selectedWebUIStatus, applyToTypeState, alreadyApplyState]);

  // 添加分组数据计算逻辑
  const groupedData = useMemo(() => {
    const groups: { [key: string]: { [key: string]: number } } = {};
    
    filteredData.forEach(item => {
      if (!groups[item.Pillar]) {
        groups[item.Pillar] = {};
      }
      if (!groups[item.Pillar][item.Category]) {
        groups[item.Pillar][item.Category] = 0;
      }
      groups[item.Pillar][item.Category]++;
    });

    return groups;
  }, [filteredData]);

  // 添加 CSV 解析函数
  const parseCSVLine = (line: string): string[] => {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // 处理双引号
          currentValue += '"';
          i++; // 跳过下一个引号
        } else {
          // 切换引号状态
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // 遇到逗号且不在引号内，添加当前值到结果中
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // 添加最后一个值
    values.push(currentValue.trim());
    return values;
  };

  useEffect(() => {
    fetch('/template.csv')
      .then(response => response.text())
      .then(text => {
        // 移除 BOM 标记
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split('\n');
        
        // 解析表头
        const headers = parseCSVLine(lines[0]);
        
        // 解析数据行
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = parseCSVLine(line);
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index] || '';
              return obj;
            }, {} as Card);
          });

        setData(rows);
        setLoading(false);
        // 在数据加载完成后，设置所有 Owner GPM 为选中状态
        const owners = new Set(rows.map(item => item['Owner GPM']));
        setSelectedOwners(Array.from(owners).filter(Boolean).sort());
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, []);  // 移除 loading 和 data 依赖

  const toggleOwner = (owner: string) => {
    setSelectedOwners(prev => {
      if (prev.includes(owner)) {
        return prev.filter(o => o !== owner);
      }
      return [...prev, owner];
    });
  };

  const toggleEligibility = (type: string) => {
    setSelectedEligibility(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  const toggleAlreadyApply = (type: string) => {
    setSelectedAlreadyApply(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
  };

  const toggleCampaignLevel = (value: string) => {
    setSelectedCampaignLevel(prev => {
      if (prev.includes(value)) {
        return prev;
      }
      return [value];
    });
  };

  const toggleUCMDMS = (value: string) => {
    setSelectedUCMDMS(prev => {
      if (prev.includes(value)) {
        return prev;
      }
      return [value];
    });
  };

  const toggleWebUIStatus = (value: string) => {
    setSelectedWebUIStatus(prev => {
      if (prev.includes(value)) {
        return prev;
      }
      return [value];
    });
  };

  const toggleApplyToType = (key: string, state: FilterState) => {
    setApplyToTypeState(prev => ({
      ...prev,
      [key]: state
    }));
  };

  const toggleAlreadyApplyState = (key: string, state: FilterState) => {
    setAlreadyApplyState(prev => ({
      ...prev,
      [key]: state
    }));
  };

  // 添加一个通用的选项样式
  const getOptionStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'rgba(173, 216, 230, 0.2)',
    borderRadius: '4px',
    cursor: 'pointer',
    border: isSelected ? '2px solid #4CAF50' : '1px solid transparent',
    boxSizing: 'border-box',
    whiteSpace: 'nowrap',  // 防止文字换行
    overflow: 'hidden',    // 确保内容不会溢出
  });

  // 修改文本 span 的样式，移除省略号相关属性
  const textStyle = (isSelected: boolean): React.CSSProperties => ({
    fontSize: '13px',
    fontWeight: isSelected ? '600' : 'normal',
    whiteSpace: 'nowrap',  // 保持文字不换行
  });

  // 修改圆点的统一样式
  const dotStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: isSelected ? '#4CAF50' : '#ccc',
    marginRight: '10px',
    flexShrink: 0,  // 防止圆点被压缩
    display: 'block'  // 确保圆点始终显示
  });

  // 添加一个 Radio 样式
  const radioStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid',
    borderColor: isSelected ? '#4CAF50' : '#ccc',
    marginRight: '10px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    padding: '2px'
  });

  // 添加一个内部圆点样式
  const radioInnerStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: isSelected ? '#4CAF50' : 'transparent',
    display: 'block'
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>{title}</h1>
      
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
        {/* Owner GPM 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '16px'
          }}>Owner GPM</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ownerGPMs.map(owner => (
              <div
                key={owner}
                onClick={() => toggleOwner(owner)}
                style={{
                  ...getOptionStyle(selectedOwners.includes(owner)),
                  width: '160px',  // 调整为更合适的宽度
                  justifyContent: 'flex-start',  // 改为左对齐
                  paddingLeft: '20px',  // 添加左侧留白
                }}
              >
                <span style={textStyle(selectedOwners.includes(owner))}>{owner}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Included in UCM DMS 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '16px'
          }}>Included in UCM DMS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['Yes', 'No', 'All'].map(value => (
              <div
                key={value}
                onClick={() => toggleUCMDMS(value)}
                style={{
                  ...getOptionStyle(selectedUCMDMS.includes(value)),
                  width: '80px',
                }}
              >
                <div style={radioStyle(selectedUCMDMS.includes(value))}>
                  <div style={radioInnerStyle(selectedUCMDMS.includes(value))} />
                </div>
                <span style={textStyle(selectedUCMDMS.includes(value))}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Can apply to campaign 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '16px'
          }}>Can apply to campaign</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {['Yes', 'No', 'All'].map(value => (
              <div
                key={value}
                onClick={() => toggleCampaignLevel(value)}
                style={{
                  ...getOptionStyle(selectedCampaignLevel.includes(value)),
                  width: '80px',
                }}
              >
                <div style={radioStyle(selectedCampaignLevel.includes(value))}>
                  <div style={radioInnerStyle(selectedCampaignLevel.includes(value))} />
                </div>
                <span style={textStyle(selectedCampaignLevel.includes(value))}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Can apply to new/existing campaign 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Can apply to</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'New', label: 'New campaign' },
              { key: 'Existing', label: 'Existing campaign' }
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '120px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}>{label}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Yes', 'No', 'All'].map((state) => (
                    <div
                      key={state}
                      onClick={() => toggleApplyToType(key, state as FilterState)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: applyToTypeState[key as keyof ApplyToTypeState] === state 
                          ? 'rgba(173, 216, 230, 0.2)'
                          : 'transparent',
                        border: applyToTypeState[key as keyof ApplyToTypeState] === state
                          ? '2px solid #4CAF50'
                          : '1px solid transparent',
                        fontSize: '13px',
                        fontWeight: applyToTypeState[key as keyof ApplyToTypeState] === state ? '600' : 'normal',
                        boxSizing: 'border-box',
                        minWidth: '45px',
                        textAlign: 'center'
                      }}
                    >
                      {state}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Can apply to 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Can apply to</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'Search', label: 'Search campaign' },
              { key: 'Pmax', label: 'Pmax campaign' },
              { key: 'Shopping', label: 'Shopping campaign' },
              { key: 'DNV', label: 'DNV campaign' }
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '120px',
                  fontSize: '13px',  // 添加字体大小
                  whiteSpace: 'nowrap'  // 防止文字换行
                }}>{label}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Yes', 'No', 'All'].map((state) => (
                    <div
                      key={state}
                      onClick={() => setEligibilityState(prev => ({
                        ...prev,
                        [key]: state as FilterState
                      }))}
                      style={{
                        padding: '6px 12px',  // 调整内边距以匹配其他过滤器
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: eligibilityState[key as keyof EligibilityState] === state 
                          ? 'rgba(173, 216, 230, 0.2)'  // 使用相同的背景色
                          : 'transparent',
                        border: eligibilityState[key as keyof EligibilityState] === state
                          ? '2px solid #4CAF50'  // 使用相同的边框样式
                          : '1px solid transparent',
                        fontSize: '13px',  // 匹配其他过滤器的字体大小
                        fontWeight: eligibilityState[key as keyof EligibilityState] === state ? '600' : 'normal',
                        boxSizing: 'border-box',
                        minWidth: '45px',  // 确保按钮宽度一致
                        textAlign: 'center'  // 文字居中
                      }}
                    >
                      {state}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Already apply to 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Already apply to</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'Search', label: 'Search campaign' },
              { key: 'Pmax', label: 'Pmax campaign' },
              { key: 'Shopping', label: 'Shopping campaign' },
              { key: 'DNV', label: 'DNV campaign' }
            ].map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ 
                  width: '120px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}>{label}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Yes', 'No', 'All'].map((state) => (
                    <div
                      key={state}
                      onClick={() => toggleAlreadyApplyState(key, state as FilterState)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: alreadyApplyState[key as keyof AlreadyApplyState] === state 
                          ? 'rgba(173, 216, 230, 0.2)'
                          : 'transparent',
                        border: alreadyApplyState[key as keyof AlreadyApplyState] === state
                          ? '2px solid #4CAF50'
                          : '1px solid transparent',
                        fontSize: '13px',
                        fontWeight: alreadyApplyState[key as keyof AlreadyApplyState] === state ? '600' : 'normal',
                        boxSizing: 'border-box',
                        minWidth: '45px',
                        textAlign: 'center'
                      }}
                    >
                      {state}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Already available on WebUI 过滤器 */}
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '4px',
          padding: '16px 16px 16px 20px',
          width: 'fit-content'
        }}>
          <h3 style={{ 
            marginBottom: '12px',
            fontSize: '16px'
          }}>Already available on WebUI</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              'Available',
              'Partially available',
              'Not available',
              'All'
            ].map(value => (
              <div
                key={value}
                onClick={() => toggleWebUIStatus(value === 'Available' ? 'Ready' : 
                                                       value === 'Partially available' ? 'Partially Ready' : 
                                                       value === 'Not available' ? 'Not Ready' :
                                                       'All')}
                style={{
                  ...getOptionStyle(selectedWebUIStatus.includes(value === 'Available' ? 'Ready' : 
                                                       value === 'Partially available' ? 'Partially Ready' : 
                                                       value === 'Not available' ? 'Not Ready' :
                                                       'All')),
                  width: '160px',
                }}
              >
                <div style={radioStyle(selectedWebUIStatus.includes(value === 'Available' ? 'Ready' : 
                                                          value === 'Partially available' ? 'Partially Ready' : 
                                                          value === 'Not available' ? 'Not Ready' :
                                                          'All'))}>
                  <div style={radioInnerStyle(selectedWebUIStatus.includes(value === 'Available' ? 'Ready' : 
                                                                 value === 'Partially available' ? 'Partially Ready' : 
                                                                 value === 'Not available' ? 'Not Ready' :
                                                                 'All'))} />
                </div>
                <span style={textStyle(selectedWebUIStatus.includes(value === 'Available' ? 'Ready' : 
                                                          value === 'Partially available' ? 'Partially Ready' : 
                                                          value === 'Not available' ? 'Not Ready' :
                                                          'All'))}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div style={{ 
        display: 'flex',
        gap: '24px'
      }}>
        {/* 导航栏 */}
        {showNavigation && (
          <div style={{
            width: '250px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            padding: '16px'
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '14px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                All <span>({filteredData.length})</span>
              </div>
            </div>
            {Object.entries(groupedData).map(([pillar, categories]) => (
              <div key={pillar} style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {pillar} <span>({Object.values(categories).reduce((a, b) => a + b, 0)})</span>
                </div>
                {Object.entries(categories).map(([category, count]) => (
                  <div key={category} style={{ 
                    marginLeft: '16px',
                    marginTop: '8px',
                    fontSize: '13px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {category} <span>({count})</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 表格区域 */}
        {showDetails && (
          <div style={{ flex: 1 }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '14px' }}>
                Details <span style={{ color: '#666' }}>({filteredData.length})</span>
              </h3>
              <button
                onClick={() => setShowAllColumns(!showAllColumns)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '4px',
                  border: '1px solid',
                  borderColor: showAllColumns ? '#1890ff' : '#d9d9d9',
                  backgroundColor: showAllColumns ? '#e6f7ff' : 'white',
                  color: showAllColumns ? '#1890ff' : '#595959',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  ':hover': {
                    borderColor: '#1890ff',
                    color: '#1890ff',
                    backgroundColor: '#f0f9ff'
                  },
                  ':active': {
                    borderColor: '#096dd9',
                    color: '#096dd9',
                    backgroundColor: '#dcf0ff'
                  }
                } as React.CSSProperties}
              >
                {showAllColumns ? 'Hide more columns' : 'Show more columns'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
                borderSpacing: 0,
              }}>
                <thead>
                  <tr style={{ 
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #ddd'
                  }}>
                    {/* 修改这里：使用 defaultColumns 而不是 Object.keys */}
                    {defaultColumns.map(key => (
                      <th key={key} style={tableHeaderStyle}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, index) => (
                    <tr key={index} style={{ 
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafafa',
                      borderBottom: '1px solid #eee'
                    }}>
                      {/* 这里也要修改：使用 defaultColumns */}
                      {defaultColumns.map(key => (
                        <td key={key} style={tableCellStyle}>{item[key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '12px',
  textAlign: 'left',
  fontWeight: 'bold',
  whiteSpace: 'nowrap',
  backgroundColor: '#f5f5f5',
  position: 'sticky',
  top: 0,
  zIndex: 1
};

const tableCellStyle: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  maxWidth: '300px',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

export default Inventory; 