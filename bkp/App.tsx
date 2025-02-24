import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';

interface FileData {
  headers: string[];
  rows: Card[];  // 使用之前定义的 Card 接口
}

interface GroupedCards {
  [pillar: string]: {
    [category: string]: Card[];  // 使用 Card 接口
  };
}

interface CardWithWeight extends Card {
  weightage?: string;
}

// 需要定义接口来约束对象的类型
interface WeightBuckets {
  [key: string]: number;
  Targeting: number;
  'Budget & Bidding': number;
  Audience: number;
  Ads: number;
  Measurement: number;
}

const WEIGHT_BUCKETS: WeightBuckets = {
  Targeting: 20,
  'Budget & Bidding': 20,
  Audience: 20,
  Ads: 20,
  Measurement: 20
};

// 添加一个计算颜色深度的函数
const getBackgroundColor = (usedWeight: number, totalWeight: number) => {
  const percentage = usedWeight / totalWeight; // 计算使用比例
  
  // 根据比例返回不同深度的绿色
  if (percentage === 0) return 'white';
  if (percentage <= 0.25) return '#f0fff0';
  if (percentage <= 0.5) return '#e0ffe0';
  if (percentage <= 0.75) return '#d0ffd0';
  if (percentage < 1) return '#c0ffc0';
  return '#b0ffb0'; // 当完全分配时的最深色
};

const getBorderColor = (usedWeight: number, totalWeight: number) => {
  const percentage = usedWeight / totalWeight;
  
  // 根据比例返回不同深度的边框颜色
  if (percentage === 0) return '#eee';
  if (percentage <= 0.25) return '#d9f2d9';
  if (percentage <= 0.5) return '#c6e6c6';
  if (percentage <= 0.75) return '#b3d9b3';
  if (percentage < 1) return '#a0cca0';
  return '#8cbf8c';
};

// 添加 Toast 相关的类型和状态
interface ToastState {
  message: string;
  visible: boolean;
}

// 添加 styles 对象的类型定义
interface CategoryStyles {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

interface StylesMap {
  [key: string]: CategoryStyles;  // 添加动态索引签名
  'Health check': CategoryStyles;
  'Feature adoption': CategoryStyles;
  'Account free': CategoryStyles;
  'Campaign limited': CategoryStyles;
  'Tactic 1': CategoryStyles;
  'Tactic 2': CategoryStyles;
  'Tactic 3': CategoryStyles;
  'Other': CategoryStyles;
}

// 添加排序顺序的类型定义
interface CategoryOrder {
  [key: string]: number;
  'Health check': number;
  'Feature adoption': number;
  'Tactic': number;
}

// 添加 Filter 选项的类型定义
interface FilterOptions {
  ucmStatus: string[];
  webUIStatus: string[];
}

// 添加 Card 类型定义
interface Card {
  Item: string;
  Pillar: string;
  Category: string;
  Campaign: string;
  'UCM status': string;
  'WebUI status': string;
  'UCM DMS Weightage': string;
  'DMS status': string;
  'UCM DMS': string;  // 添加这个字段
  'Tactic code': string;  // 添加这个字段
  'Campaign creation'?: string;
  'Existing campaign'?: string;
  'Notes'?: string;
  weightage?: string;
  [key: string]: string | undefined;  // 添加索引签名
}

// 修改 Category 颜色映射函数
const getCategoryStyle = (category: string) => {
  const styles: StylesMap = {
    'Health check': {
      backgroundColor: '#fff1f0',
      borderColor: '#ffa39e',
      color: '#cf1322'
    },
    'Feature adoption': {
      backgroundColor: '#fffbe6',
      borderColor: '#ffe58f',
      color: '#d46b08'
    },
    'Account free': {
      backgroundColor: '#fff7e6',
      borderColor: '#ffd591',
      color: '#d48806'
    },
    'Campaign limited': {
      backgroundColor: '#fff7e6',
      borderColor: '#ffd591',
      color: '#d48806'
    },
    'Tactic 1': {
      backgroundColor: '#f6ffed',
      borderColor: '#b7eb8f',
      color: '#389e0d'
    },
    'Tactic 2': {
      backgroundColor: '#e6fffb',
      borderColor: '#87e8de',
      color: '#08979c'
    },
    'Tactic 3': {
      backgroundColor: '#e6f7ff',
      borderColor: '#91d5ff',
      color: '#096dd9'
    },
    'Other': {
      backgroundColor: '#f5f5f5',
      borderColor: '#d9d9d9',
      color: '#595959'
    }
  } as const;

  // 判断是否是 Tactic 类型
  if (category.toLowerCase().includes('tactic')) {
    const tacticNumber = category.match(/\d+/)?.[0] || '1';
    return styles[`Tactic ${tacticNumber}`] || styles['Other'];
  }

  // 判断是否是 Feature adoption 类型（不区分大小写）
  if (category.toLowerCase().includes('feature adoption')) {
    return styles['Feature adoption'];
  }

  return styles[category] || styles['Other'];
};

// 添加 JSX 相关的类型声明
declare namespace JSX {
  interface IntrinsicElements {
    div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    h4: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    h5: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
    input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
    label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
    select: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>;
    option: React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>;
    strong: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    style: React.DetailedHTMLProps<React.StyleHTMLAttributes<HTMLStyleElement>, HTMLStyleElement>;
  }
}

// 添加事件处理函数的类型
interface DragEvent<T = Element> extends React.MouseEvent<T> {
  dataTransfer: DataTransfer;
}

// 添加权重计算相关的接口
interface UsedWeights {
  [key: string]: number;
  Targeting: number;
  'Budget & Bidding': number;
  Audience: number;
  Ads: number;
  Measurement: number;
}

function App() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [selectedCards, setSelectedCards] = useState<CardWithWeight[]>([]);
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDMSStatus, setSelectedDMSStatus] = useState<string[]>([]);
  const [selectedUCMStatus, setSelectedUCMStatus] = useState<string>('All');
  const [selectedWebUIStatus, setSelectedWebUIStatus] = useState<string>('All');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('All');
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [toast, setToast] = useState<ToastState>({ message: '', visible: false });
  const [baseCardList, setBaseCardList] = useState<FileData | null>(null);

  // 获取所有唯一的 Campaign 值，包含 "-" 值
  const campaignOptions = useMemo(() => {
    if (!fileData?.rows) return ['All'];
    const options = Array.from(new Set(fileData.rows.map(row => row.Campaign)))
      .filter(campaign => campaign)  // 只过滤掉 null/undefined/空字符串
      .sort();
    return ['All', ...options];
  }, [fileData?.rows]);

  // 修改 pillarsAndCategories 的计算逻辑
  const pillarsAndCategories = useMemo(() => {
    if (!fileData) return { pillars: [], categoriesByPillar: {} };
    
    // 获取所有非空的 Pillars
    const pillars = Array.from(new Set(
      fileData.rows
        .map(row => row.Pillar)
        .filter(pillar => pillar && pillar !== 'Other')  // 过滤掉空值和 'Other'
    ));
    
    // 为每个 Pillar 获取其 Categories
    const categoriesByPillar = pillars.reduce((acc, pillar) => {
      acc[pillar] = Array.from(new Set(
        fileData.rows
          .filter(row => row.Pillar === pillar)  // 只获取当前 Pillar 的行
          .map(row => row.Category)
          .filter(category => category && category !== 'Other')  // 过滤掉空值和 'Other'
      ));
      return acc;
    }, {} as Record<string, string[]>);

    return { pillars, categoriesByPillar };
  }, [fileData]);

  // 获取所有可能的 DMS status 选项
  const dmsStatusOptions = useMemo(() => {
    if (!fileData) return [];
    const statusSet = new Set<string>();
    fileData.rows.forEach(row => {
      if (row['DMS status']) {
        statusSet.add(row['DMS status']);
      }
    });
    return Array.from(statusSet).sort();
  }, [fileData]);

  // 获取所有可能的 UCM status 选项
  const ucmStatusOptions = useMemo(() => {
    if (!fileData) return ['All'];
    const statusSet = new Set<string>();
    fileData.rows.forEach(row => {
      if (row['UCM status']) {
        statusSet.add(row['UCM status']);
      }
    });
    return ['All', ...Array.from(statusSet).sort()];
  }, [fileData]);

  // 获取所有可能的 WebUI status 选项
  const webUIStatusOptions = useMemo(() => {
    if (!fileData) return ['All'];
    const statusSet = new Set<string>();
    fileData.rows.forEach(row => {
      if (row['WebUI status']) {
        statusSet.add(row['WebUI status']);
      }
    });
    return ['All', ...Array.from(statusSet).sort()];
  }, [fileData]);

  // 初始化选中所有选项
  useEffect(() => {
    if (dmsStatusOptions.length > 0) {
      setSelectedDMSStatus(dmsStatusOptions);
    }
  }, [dmsStatusOptions]);

  // 修改 availableCards 的过滤逻辑
  const availableCards = useMemo(() => {
    if (!fileData) return [];
    
    return fileData.rows.filter(row => {
      // 检查是否已被选择
      const isCardSelected = selectedCards.some(selected => 
        selected['Item'] === row['Item'] && 
        selected['UCM DMS Weightage'] === row['UCM DMS Weightage'] &&
        selected['UCM status'] === row['UCM status'] &&
        selected['WebUI status'] === row['WebUI status'] &&
        selected['Campaign'] === row['Campaign']
      );
      
      if (isCardSelected) return false;

      // 应用所有过滤条件
      const matchPillar = !selectedPillar || (row.Pillar || 'Other') === selectedPillar;
      const matchCategory = !selectedCategory || (row.Category || 'Other') === selectedCategory;
      const matchUCMStatus = selectedUCMStatus === 'All' || row['UCM status'] === selectedUCMStatus;
      const matchWebUIStatus = selectedWebUIStatus === 'All' || row['WebUI status'] === selectedWebUIStatus;
      const matchCampaign = selectedCampaign === 'All' || row.Campaign === selectedCampaign;

      return matchPillar && matchCategory && matchUCMStatus && matchWebUIStatus && matchCampaign;
    });
  }, [fileData, selectedCards, selectedPillar, selectedCategory, selectedUCMStatus, selectedWebUIStatus, selectedCampaign]);

  // 首先添加一个分组函数
  const groupedSelectedCards = useMemo(() => {
    const groups: Record<string, Record<string, CardWithWeight[]>> = {};
    selectedCards.forEach(card => {
      const pillar = card.Pillar || 'Other';
      const category = card.Category || 'Other';
      if (!groups[pillar]) {
        groups[pillar] = {};
      }
      if (!groups[pillar][category]) {
        groups[pillar][category] = [];
      }
      groups[pillar][category].push(card);
    });
    return groups;
  }, [selectedCards]);

  // 计算已使用的权重
  const calculateUsedWeights = useMemo(() => {
    const usedWeights: UsedWeights = {
      'Targeting': 0,
      'Budget & Bidding': 0,
      'Audience': 0,
      'Ads': 0,
      'Measurement': 0
    };

    selectedCards.forEach(card => {
      if (card.weightage && card.Pillar && card.Pillar in usedWeights) {
        usedWeights[card.Pillar as keyof UsedWeights] += parseFloat(card.weightage);
      }
    });

    return usedWeights;
  }, [selectedCards]);

  // 计算可用的权重
  const availableWeights = useMemo(() => {
    const available = { ...WEIGHT_BUCKETS };
    (Object.keys(available) as Array<keyof WeightBuckets>).forEach(key => {
      const used = calculateUsedWeights[key];
      available[key] = Math.max(0, available[key] - used);
    });
    return available;
  }, [calculateUsedWeights]);

  // 添加一个计算 Category 权重的函数
  interface CategoryWeight {
    [category: string]: string;
  }

  interface PillarCategoryWeights {
    [pillar: string]: CategoryWeight;
  }

  const calculateCategoryWeights = useMemo(() => {
    const categoryWeights: PillarCategoryWeights = {};
    
    selectedCards.forEach(card => {
      if (card.weightage && card.Pillar) {
        const pillar = card.Pillar;
        const category = card.Category || 'Other';
        
        if (!categoryWeights[pillar]) {
          categoryWeights[pillar] = {};
        }
        if (!categoryWeights[pillar][category]) {
          categoryWeights[pillar][category] = '0';
        }
        
        const currentWeight = parseFloat(categoryWeights[pillar][category]);
        categoryWeights[pillar][category] = (currentWeight + parseFloat(card.weightage)).toString();
      }
    });
    
    return categoryWeights;
  }, [selectedCards]);

  // 修改导出函数
  const handleExport = () => {
    if (!fileData || !selectedCards.length) return;

    const generateCSV = () => {
      const headers = [
        'Pillar', 'Category', 'Item', 'UCM DMS Weightage', 'UCM status',
        'WebUI status', 'Campaign', 'Campaign creation', 'Existing campaign',
        'Notes', 'WebUI Weightage'
      ];

      const escapeField = (value: string | undefined): string => {
        if (value === undefined) return '';
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };

      const rows = selectedCards.map(card => {
        return headers.map(header => {
          if (header === 'WebUI Weightage') {
            return card.weightage ? `${card.weightage}%` : '';
          }
          return escapeField(card[header] || '');
        }).join(',');
      });

      return [headers.join(','), ...rows].join('\n');
    };

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';

    // 创建对话框容器
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.top = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.backgroundColor = 'white';
    container.style.padding = '20px';
    container.style.borderRadius = '8px';
    container.style.zIndex = '1001';
    container.style.minWidth = '300px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '15px';

    // 添加标题
    const title = document.createElement('h3');
    title.textContent = 'Save File As';
    title.style.margin = '0';
    container.appendChild(title);

    // 创建文件名输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.value = 'new.csv';
    input.style.padding = '8px';
    input.style.border = '1px solid #ccc';
    input.style.borderRadius = '4px';
    input.style.width = '100%';
    container.appendChild(input);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.gap = '10px';

    // 取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.padding = '6px 12px';
    cancelButton.style.border = '1px solid #ccc';
    cancelButton.style.borderRadius = '4px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.onclick = () => {
      document.body.removeChild(overlay);
      document.body.removeChild(container);
    };

    // 保存按钮
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
    saveButton.style.padding = '6px 12px';
    saveButton.style.backgroundColor = '#4CAF50';
    saveButton.style.color = 'white';
    saveButton.style.border = 'none';
    saveButton.style.borderRadius = '4px';
    saveButton.style.cursor = 'pointer';
    saveButton.onclick = () => {
      const fileName = input.value || 'new.csv';
      const csvContent = generateCSV();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, fileName);
      document.body.removeChild(overlay);
      document.body.removeChild(container);
      showToast('File downloaded successfully');
    };

    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(saveButton);
    container.appendChild(buttonContainer);

    document.body.appendChild(overlay);
    document.body.appendChild(container);
    input.focus();
    input.select();
  };

  // 在组件加载时获取基础卡片列表
  useEffect(() => {
    fetch('./template.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load template.csv');
        }
        return response.text();
      })
      .then(text => {
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = parseCSVLine(line);
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index] || '';
              return obj;
            }, {} as any);
          });

        setBaseCardList({ headers, rows });
        setFileData({ headers, rows });
      })
      .catch(error => {
        console.error('Error loading template card list:', error);
        showToast('Failed to load template cards. Please check if template.csv exists in public folder.');
      });
  }, []);

  // 修改文件上传处理函数
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && baseCardList) {  // 确保基础卡片列表已加载
      setOriginalFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const cleanText = text.replace(/^\uFEFF/, '');
        const lines = cleanText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const rows = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = parseCSVLine(line);
            return headers.reduce((obj, header, index) => {
              obj[header] = values[index] || '';
              return obj;
            }, {} as any);
          });

        // 如果包含 WebUI Weightage 字段，处理选中的卡片
        if (rows.some(row => row['WebUI Weightage'])) {
          const cardsWithWeightage = rows.filter(row => {
            const weightage = row['WebUI Weightage'];
            return weightage && !isNaN(parseFloat(weightage.replace('%', '').trim()));
          }).map(row => ({
            ...row,
            weightage: parseFloat(row['WebUI Weightage'].replace('%', '').trim())
          }));

          if (cardsWithWeightage.length > 0) {
            setSelectedCards(cardsWithWeightage);
            
            // 更新 Available Cards：从基础列表中移除已选中的卡片
            const remainingCards = baseCardList.rows.filter(baseCard => 
              !cardsWithWeightage.some(selectedCard => 
                baseCard['Item'] === selectedCard['Item'] && 
                baseCard['UCM DMS Weightage'] === selectedCard['UCM DMS Weightage'] &&
                baseCard['UCM status'] === selectedCard['UCM status'] &&
                baseCard['WebUI status'] === selectedCard['WebUI status'] &&
                baseCard['Campaign'] === selectedCard['Campaign']
              )
            );
            
            // 更新显示的卡片列表
            setFileData({
              headers: baseCardList.headers,
              rows: remainingCards
            });
            
            showToast(`Loaded ${cardsWithWeightage.length} cards with weightage`);
          }
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  // 定义标签样式
  const labelStyle = {
    display: 'inline-block',
    padding: '2px 8px',
    marginRight: '6px',
    marginBottom: '6px',
    borderRadius: '12px',
    border: '1px solid #e1f0ff',
    backgroundColor: '#f5f9ff',
    fontSize: '11px',
    color: '#0066cc'
  };

  // 修改卡片渲染部分
  const renderCard = (card: Card) => (
    <div style={{
      padding: '12px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      cursor: 'move',
      backgroundColor: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      fontSize: '13px'
    }}>
      {/* Labels 区域 */}
      <div style={{ 
        marginBottom: '12px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        {/* 添加 Category 标签 */}
        {card['Category'] && card['Category'] !== '-' && (
          <span style={{
            ...labelStyle,
            ...getCategoryStyle(card['Category'])
          }}>{card['Category']}</span>
        )}
        {card['UCM status'] && card['UCM status'] !== '-' && (
          <span style={labelStyle}>{card['UCM status']}</span>
        )}
        {card['WebUI status'] && card['WebUI status'] !== '-' && (
          <span style={labelStyle}>{card['WebUI status']}</span>
        )}
        {card['Campaign'] && card['Campaign'] !== '-' && (
          <span style={labelStyle}>{card['Campaign']}</span>
        )}
        {card['Campaign creation'] && card['Campaign creation'] !== '-' && (
          <span style={labelStyle}>{card['Campaign creation']}</span>
        )}
        {card['Existing campaign'] && card['Existing campaign'] !== '-' && (
          <span style={labelStyle}>{card['Existing campaign']}</span>
        )}
      </div>

      {/* 主要信息区域 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Item */}
        {card['Item'] && (
          <div style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal',
            lineHeight: '1.4'
          }}>
            <strong>Item:</strong> {card['Item']}
          </div>
        )}
        
        {/* UCM DMS Weightage */}
        {card['UCM DMS Weightage'] && (
          <div style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            <strong>UCM DMS Weightage:</strong> {card['UCM DMS Weightage']}
          </div>
        )}

        {/* Notes - 新增 */}
        {card['Notes'] && card['Notes'] !== '-' && (
          <div style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'normal',
            lineHeight: '1.4',
            color: '#666',
            fontSize: '12px',
            padding: '4px 8px',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            border: '1px solid #eee'
          }}>
            <strong>Notes:</strong> {card['Notes']}
          </div>
        )}
      </div>
    </div>
  );

  // 修改 Filter 选项的类型和实现
  const getFilterOptions: FilterOptions = {
    ucmStatus: ucmStatusOptions,
    webUIStatus: webUIStatusOptions
  };

  // 添加显示 toast 的函数
  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000); // 3秒后自动隐藏
  };

  // 修改文件上传区域的样式
  const uploadButtonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    marginRight: '10px'
  };

  // 修改 parseCSVLine 函数来正确处理双引号
  const parseCSVLine = (line: string) => {
    const values: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // 处理两个连续的双引号，保留为一个双引号
          currentValue += '"';
          i++; // 跳过下一个引号
        } else {
          // 切换引号状态
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 只有在不在引号内时才分割字段
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // 添加最后一个字段
    
    return values.map(value => {
      value = value.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        // 移除外层引号，但保留内部的双引号
        return value.slice(1, -1);
      }
      return value;
    });
  };

  // 修改计数函数，添加 Campaign 过滤
  const getFilteredCardCount = (cards: any[], pillar?: string, category?: string) => {
    return cards.filter(card => {
      // 考虑所有过滤条件
      const matchUCMStatus = selectedUCMStatus === 'All' || card['UCM status'] === selectedUCMStatus;
      const matchWebUIStatus = selectedWebUIStatus === 'All' || card['WebUI status'] === selectedWebUIStatus;
      const matchCampaign = selectedCampaign === 'All' || card.Campaign === selectedCampaign;
      const matchPillar = !pillar || card.Pillar === pillar;
      const matchCategory = !category || card.Category === category;

      return matchPillar && matchCategory && matchUCMStatus && matchWebUIStatus && matchCampaign;
    }).length;
  };

  // 修改排序顺序的类型
  const order: CategoryOrder = {
    'Health check': 1,
    'Feature adoption': 2,
    'Tactic': 3
  };

  return (
    <div style={{ 
      padding: '20px 20px 0 20px',
      height: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 标题和操作区域的容器 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexShrink: 0
      }}>
        {/* 标题区域 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'  // 添加间距
        }}>
          <h1 style={{ 
            margin: 0,
            fontSize: '24px',
            color: '#1a1a1a'
          }}>
            DMS on WebUI Configuration Manager
          </h1>
          
          {/* 添加 DMS Inventory 链接 */}
          <Link
            to="/inventory"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#0066cc',
              textDecoration: 'none',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            DMS Inventory
            <span style={{ fontSize: '12px' }}>↗</span>
          </Link>
        </div>

        {/* 文件上传区域 */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{
            color: '#666',
            fontSize: '14px'
          }}>
            You can upload an existing configuration file to update and save the change.
          </span>
          
          <label style={{
            ...uploadButtonStyle,
            backgroundColor: '#0066cc',
            color: 'white',
            display: 'inline-block'
          }}>
            Upload
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>

          <button
            onClick={handleExport}
            disabled={!selectedCards.length}
            style={{
              ...uploadButtonStyle,
              backgroundColor: selectedCards.length ? '#4CAF50' : '#ccc',
              color: 'white',
              cursor: selectedCards.length ? 'pointer' : 'not-allowed'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>

      {fileData && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '250px 400px 1fr',  // 将固定宽度改为自适应
            gap: '20px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* 左侧筛选区域 */}
            <div style={{ 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ 
                margin: '0',
                padding: '15px',
                flexShrink: 0,
                borderBottom: '1px solid #ddd',
                backgroundColor: '#f9f9f9'
              }}>
                All items available on UCM
              </h3>
              
              {/* All 选项 */}
              <div 
                onClick={() => {
                  setSelectedPillar('');
                  setSelectedCategory('');
                }}
                style={{
                  padding: '10px 15px',
                  cursor: 'pointer',
                  backgroundColor: !selectedPillar && !selectedCategory ? '#e6e6e6' : 'transparent',
                  borderBottom: '1px solid #ddd',
                  fontSize: '14px',
                  color: !selectedPillar && !selectedCategory ? '#333' : '#666',
                  transition: 'background-color 0.2s'
                }}
              >
                All ({getFilteredCardCount(fileData?.rows || [])})
              </div>

              {/* 原有的导航内容 */}
              <div style={{ 
                padding: '15px',
                overflow: 'auto',
                flex: 1,
                minHeight: 0
              }}>
                {pillarsAndCategories.pillars.map(pillar => (
                  <div key={pillar} style={{ marginBottom: '15px' }}>
                    <div
                      onClick={() => {
                        setSelectedPillar(pillar);
                        setSelectedCategory('');
                      }}
                      style={{
                        cursor: 'pointer',
                        color: selectedPillar === pillar ? '#0066cc' : '#333',
                        fontWeight: selectedPillar === pillar ? 'bold' : 'normal',
                        marginBottom: '8px'
                      }}
                    >
                      {pillar} ({getFilteredCardCount(fileData?.rows || [], pillar)})
                    </div>
                    {pillarsAndCategories.categoriesByPillar[pillar]?.map(category => (
                      <div
                        key={category}
                        onClick={() => {
                          setSelectedPillar(pillar);
                          setSelectedCategory(category);
                        }}
                        style={{
                          padding: '4px 12px',
                          cursor: 'pointer',
                          color: selectedPillar === pillar && selectedCategory === category ? '#0066cc' : '#666',
                          backgroundColor: selectedPillar === pillar && selectedCategory === category ? '#f0f7ff' : 'transparent',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          fontSize: '13px'
                        }}
                      >
                        {category} ({getFilteredCardCount(fileData?.rows || [], pillar, category)})
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 中间区域改为单列 */}
            <div style={{ 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <h3 style={{ 
                margin: '0',
                padding: '15px',
                flexShrink: 0
              }}>
                Available Cards
              </h3>
              
              {/* UCM Status Filter */}
              <div style={{
                padding: '0 15px 15px 15px',
                borderBottom: '1px solid #eee',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <label style={{
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    UCM Status Filter
                  </label>
                  <select
                    value={selectedUCMStatus}
                    onChange={(e) => setSelectedUCMStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '13px',
                      height: '32px'
                    }}
                  >
                    {getFilterOptions.ucmStatus.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* WebUI Status Filter */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <label style={{
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    WebUI Status Filter
                  </label>
                  <select
                    value={selectedWebUIStatus}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSelectedWebUIStatus(e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '13px',
                      height: '32px'
                    }}
                  >
                    {getFilterOptions.webUIStatus.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campaign Filter */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px'
                }}>
                  <label style={{
                    fontSize: '13px',
                    color: '#666'
                  }}>
                    Campaign Filter
                  </label>
                  <select
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      fontSize: '13px',
                      height: '32px'
                    }}
                  >
                    {campaignOptions.map(campaign => (
                      <option key={campaign} value={campaign}>{campaign}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 卡片列表 */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                padding: '15px',
                overflow: 'auto',
                flex: 1,
                minHeight: 0
              }}>
                {availableCards
                  .filter(card => 
                    (selectedUCMStatus === 'All' || card['UCM status'] === selectedUCMStatus) &&
                    (selectedWebUIStatus === 'All' || card['WebUI status'] === selectedWebUIStatus)
                  )
                  .map((card) => (
                    <div
                      key={`${card['Item']}-${card['UCM DMS Weightage']}`}
                      draggable
                      onDragStart={(e: DragEvent<HTMLDivElement>) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify(card));
                      }}
                    >
                      {renderCard(card as Card)}
                    </div>
                  ))}
              </div>
            </div>

            {/* 右侧已选区域 */}
            <div style={{ 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '800px'  // 设置最小宽度，确保不会太窄
            }}>
              {/* Calculation 区域 */}
              <div style={{
                padding: '15px',
                borderBottom: '1px solid #ddd'
              }}>
                <h3 style={{ 
                  margin: '0 0 15px 0',
                  fontSize: '16px'
                }}>
                  Weights Calculation
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '250px 1fr',  // 增加左侧区域宽度
                  gap: '30px'  // 增加间距
                }}>
                  {/* Available Weights */}
                  <div>
                    <h4 style={{
                      margin: '0 0 10px 0',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      Available Weights
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {Object.entries(availableWeights).map(([bucket, weight]) => (
                        <div key={bucket} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          alignItems: 'center',
                          border: '1px solid #e0e0e0',
                          height: '26px'  // 改为 26px，与右侧完全一致
                        }}>
                          <span>{bucket}</span>
                          <span>{weight.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Selected Weights */}
                  <div>
                    <h4 style={{
                      margin: '0 0 10px 0',
                      fontSize: '14px',
                      color: '#666'
                    }}>
                      Selected Weights
                    </h4>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {Object.entries(calculateUsedWeights).map(([pillar, weight]) => {
                        const totalWeight = WEIGHT_BUCKETS[pillar];
                        const categories = calculateCategoryWeights[pillar] || {};
                        
                        return (
                          <div key={pillar} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                          }}>
                            {/* Pillar 总权重 */}
                            <div style={{
                              width: '200px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '13px',
                              padding: '6px 12px',
                              backgroundColor: getBackgroundColor(weight, totalWeight),
                              borderRadius: '4px',
                              border: `1px solid ${getBorderColor(weight, totalWeight)}`,
                              fontWeight: 'bold',
                              flexShrink: 0,
                              height: '26px',
                              alignItems: 'center'  // 添加垂直居中对齐
                            }}>
                              <span>{pillar}</span>
                              <span>{weight.toFixed(2)}%</span>
                            </div>
                            
                            {/* Category 权重列表 */}
                            <div style={{
                              display: 'flex',
                              gap: '8px',  // 调整间距
                              flex: 1,
                              alignItems: 'center'
                            }}>
                              {Object.entries(categories)
                                // 对 categories 进行排序，确保特定顺序
                                .sort(([a], [b]) => {
                                  // 获取 category 的基本类型（去除数字等）
                                  const getBaseCategory = (cat: string) => {
                                    if (cat.toLowerCase().includes('health check')) return 'Health check';
                                    if (cat.toLowerCase().includes('feature')) return 'Feature adoption';
                                    if (cat.toLowerCase().includes('tactic')) return 'Tactic';
                                    return cat;
                                  };
                                  
                                  const baseA = getBaseCategory(a);
                                  const baseB = getBaseCategory(b);
                                  
                                  // 如果基本类型不同，按优先级排序
                                  if (order[baseA] && order[baseB]) {
                                    return order[baseA] - order[baseB];
                                  }
                                  
                                  // 如果是同一基本类型，按原始名称排序
                                  return a.localeCompare(b);
                                })
                                .map(([category, categoryWeight]) => (
                                  <div key={category} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: '12px',
                                    padding: '6px 12px',
                                    color: '#666',
                                    backgroundColor: 'white',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    minWidth: '140px',
                                    height: '26px',
                                    alignItems: 'center'  // 添加垂直居中对齐
                                  }}>
                                    <span>{category}</span>
                                    <span style={{ marginLeft: '12px' }}>{parseFloat(categoryWeight).toFixed(2)}%</span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* 原有的 Selected Cards 内容 */}
              <h3 style={{ 
                margin: '0',
                padding: '15px',
                flexShrink: 0
              }}>
                Selected Cards
              </h3>
              <div 
                style={{ 
                  padding: '15px',
                  overflow: 'auto',
                  flex: 1,
                  minHeight: 0
                }}
                onDragOver={(e) => {
                  e.preventDefault();  // 必须阻止默认行为
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    const droppedCard = JSON.parse(e.dataTransfer.getData('text/plain'));
                    // 检查卡片是否已存在
                    if (!selectedCards.some(card => JSON.stringify(card) === JSON.stringify(droppedCard))) {
                      setSelectedCards(prevCards => [...prevCards, droppedCard]);
                    }
                  } catch (error) {
                    console.error('Error processing dropped card:', error);
                  }
                }}
              >
                {Object.entries(groupedSelectedCards).map(([pillar, categories]) => (
                  <div key={pillar} style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>{pillar}</h4>
                    {Object.entries(categories).map(([category, cards]) => (
                      <div key={category} style={{ marginBottom: '15px', marginLeft: '15px' }}>
                        <h5 style={{ margin: '0 0 10px 0', color: '#888' }}>{category}</h5>
                        {cards.map((card) => (
                          <div
                            key={`${card['UCM DMS']}-${card['Tactic code']}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                              marginBottom: '15px'
                            }}
                          >
                            {/* 卡片主体部分保持不变 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '10px',
                            }}>
                              {/* 卡片内容 */}
                              <div style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                backgroundColor: 'white',
                                position: 'relative'
                              }}>
                                {/* Labels 区域 */}
                                <div style={{ 
                                  marginBottom: '12px',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px'
                                }}>
                                  {/* 添加 Category 标签 */}
                                  {card['Category'] && card['Category'] !== '-' && (
                                    <span style={{
                                      ...labelStyle,
                                      ...getCategoryStyle(card['Category'])
                                    }}>{card['Category']}</span>
                                  )}
                                  {card['UCM status'] && card['UCM status'] !== '-' && (
                                    <span style={labelStyle}>{card['UCM status']}</span>
                                  )}
                                  {card['WebUI status'] && card['WebUI status'] !== '-' && (
                                    <span style={labelStyle}>{card['WebUI status']}</span>
                                  )}
                                  {card['Campaign'] && card['Campaign'] !== '-' && (
                                    <span style={labelStyle}>{card['Campaign']}</span>
                                  )}
                                  {card['Campaign creation'] && card['Campaign creation'] !== '-' && (
                                    <span style={labelStyle}>{card['Campaign creation']}</span>
                                  )}
                                  {card['Existing campaign'] && card['Existing campaign'] !== '-' && (
                                    <span style={labelStyle}>{card['Existing campaign']}</span>
                                  )}
                                </div>

                                {/* 主要信息区域 */}
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}>
                                  {/* Item */}
                                  {card['Item'] && (
                                    <div style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'normal',
                                      lineHeight: '1.4'
                                    }}>
                                      <strong>Item:</strong> {card['Item']}
                                    </div>
                                  )}
                                  
                                  {/* UCM DMS Weightage */}
                                  {card['UCM DMS Weightage'] && (
                                    <div style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <strong>UCM DMS Weightage:</strong> {card['UCM DMS Weightage']}
                                    </div>
                                  )}

                                  {/* Notes - 新增 */}
                                  {card['Notes'] && card['Notes'] !== '-' && (
                                    <div style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'normal',
                                      lineHeight: '1.4',
                                      color: '#666',
                                      fontSize: '12px',
                                      padding: '4px 8px',
                                      backgroundColor: '#f9f9f9',
                                      borderRadius: '4px',
                                      border: '1px solid #eee'
                                    }}>
                                      <strong>Notes:</strong> {card['Notes']}
                                    </div>
                                  )}
                                </div>

                                {/* 删除按钮 */}
                                <button
                                  onClick={() => {
                                    setSelectedCards(prevCards => 
                                      prevCards.filter(c => {
                                        // 使用更精确的比较方式
                                        return !(
                                          c['Item'] === card['Item'] && 
                                          c['UCM DMS Weightage'] === card['UCM DMS Weightage'] &&
                                          c['UCM status'] === card['UCM status'] &&
                                          c['WebUI status'] === card['WebUI status'] &&
                                          c['Campaign'] === card['Campaign']
                                        );
                                      })
                                    );
                                  }}
                                  style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    border: 'none',
                                    background: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: '#666',
                                    fontSize: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'color 0.2s'
                                  }}
                                  onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => 
                                    e.currentTarget.style.color = '#ff4444'
                                  }
                                  onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => 
                                    e.currentTarget.style.color = '#666'
                                  }
                                >
                                  ×
                                </button>
                              </div>

                              {/* Weightage 输入框 */}
                              <div style={{
                                width: '100px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}>
                                <label style={{ 
                                  fontSize: '12px', 
                                  color: '#666'
                                }}>
                                  Weightage
                                </label>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center'
                                }}>
                                  <input
                                    type="text"
                                    value={card.weightage || ''}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '');  // 只允许数字
                                      const numericValue = parseInt(value, 10);
                                      
                                      if (!value) {
                                        // 如果输入为空，直接清除权重
                                        setSelectedCards(cards =>
                                          cards.map(c =>
                                            c['Item'] === card['Item'] && 
                                            c['UCM DMS'] === card['UCM DMS'] && 
                                            c['Tactic code'] === card['Tactic code'] &&
                                            c['Campaign'] === card['Campaign'] &&
                                            c['UCM status'] === card['UCM status'] &&
                                            c['WebUI status'] === card['WebUI status']
                                              ? { ...c, weightage: undefined }
                                              : c
                                          )
                                        );
                                        return;
                                      }

                                      // 计算当前 pillar 的总权重（不包括当前卡片）
                                      const currentPillarTotal = selectedCards.reduce((sum, c) => {
                                        if (c.Pillar === card.Pillar && c !== card && c.weightage) {
                                          return sum + parseFloat(c.weightage);
                                        }
                                        return sum;
                                      }, 0);

                                      // 检查是否已达到权重限制
                                      if (currentPillarTotal >= WEIGHT_BUCKETS[card.Pillar]) {
                                        showToast(
                                          `The limit of weightage of this pillar is reached, please adjust across the items you selected.`
                                        );
                                        return;
                                      }

                                      // 计算新的权重是否会超过限制
                                      const maxAllowed = WEIGHT_BUCKETS[card.Pillar] - currentPillarTotal;
                                      const newValue = Math.min(numericValue, maxAllowed);

                                      if (newValue >= 0) {
                                        setSelectedCards(cards =>
                                          cards.map(c =>
                                            c['Item'] === card['Item'] && 
                                            c['UCM DMS'] === card['UCM DMS'] && 
                                            c['Tactic code'] === card['Tactic code'] &&
                                            c['Campaign'] === card['Campaign'] &&
                                            c['UCM status'] === card['UCM status'] &&
                                            c['WebUI status'] === card['WebUI status']
                                              ? { ...c, weightage: newValue.toString() }
                                              : c
                                          )
                                        );
                                      }
                                    }}
                                    style={{
                                      width: '35px',
                                      padding: '4px 6px',
                                      border: '1px solid #ccc',
                                      borderRadius: '4px',
                                      fontSize: '13px',
                                      textAlign: 'right'
                                    }}
                                  />
                                  <span style={{
                                    marginLeft: '2px',
                                    fontSize: '13px',
                                    color: '#666'
                                  }}>
                                    .00 %
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* 添加 Toast 组件 */}
      {toast.visible && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '4px',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* 添加动画样式 */}
      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, 20px);
            }
            to {
              opacity: 1;
              transform: translate(-50%, 0);
            }
          }
        `}
      </style>
    </div>
  );
}

export default App; 