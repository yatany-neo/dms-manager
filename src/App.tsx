import React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { Link } from 'react-router-dom';
import { exportToCSV } from './utils/csvExporter';

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
  const [selectedOwnerGPMs, setSelectedOwnerGPMs] = useState<string[]>([]);
  const [selectedUCMDMS, setSelectedUCMDMS] = useState<string>('Yes');
  const [selectedCampaignLevel, setSelectedCampaignLevel] = useState<string>('Yes');

  // 添加 Can apply to new/existing campaign 状态
  const [applyToState, setApplyToState] = useState({
    New: 'All',
    Existing: 'All'
  } as { [key: string]: string });

  // 添加 Can apply to campaign type 状态
  const [applyCampaignTypeState, setApplyCampaignTypeState] = useState({
    Search: 'All',
    Pmax: 'All',
    Shopping: 'All',
    DNV: 'All'
  } as { [key: string]: string });

  // 添加 Already apply to campaign type 状态
  const [alreadyApplyTypeState, setAlreadyApplyTypeState] = useState({
    Search: 'All',
    Pmax: 'All',
    Shopping: 'All',
    DNV: 'All'
  } as { [key: string]: string });

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

  // 获取所有 Owner GPM 选项，确保返回的是 string[] 类型
  const ownerGPMOptions = useMemo(() => {
    if (!fileData?.rows) return [];
    const owners = fileData.rows
      .map(row => row['Owner GPM'])
      .filter((owner): owner is string => typeof owner === 'string' && owner !== '');
    return Array.from(new Set(owners));
  }, [fileData]);

  // 初始化选中所有选项
  useEffect(() => {
    if (fileData?.rows) {
      const owners = new Set(fileData.rows
        .map(item => item['Owner GPM'])
        .filter((owner): owner is string => owner !== undefined));
      setSelectedOwnerGPMs(Array.from(owners).sort());
    }
  }, [fileData]);

  // 整合所有过滤器的逻辑到一个 filteredData
  const filteredData = useMemo(() => {
    let filtered = fileData?.rows || [];
    
    // Owner GPM 过滤
    if (selectedOwnerGPMs.length === 0) {
      return [];  // 当没有选中任何 Owner GPM 时返回空数组
    }
    filtered = filtered.filter(item => {
      const ownerGPM = item['Owner GPM'];
      return ownerGPM && selectedOwnerGPMs.includes(ownerGPM);
    });

    // UCM DMS 过滤
    if (selectedUCMDMS !== 'All') {
      filtered = filtered.filter(item => 
        selectedUCMDMS === 'Yes' 
          ? item['UCM status'] === 'Included in UCM DMS'
          : item['UCM status'] !== 'Included in UCM DMS'
      );
    }

    // Campaign Level 过滤
    if (selectedCampaignLevel !== 'All') {
      filtered = filtered.filter(item =>
        selectedCampaignLevel === 'Yes'
          ? item['Can apply to campaign level'] === 'Can apply to campaign level'
          : item['Can apply to campaign level'] !== 'Can apply to campaign level'
      );
    }

    // 其他过滤条件
    filtered = filtered.filter(item => {
      return (
        // DMS Status 过滤
        (!selectedDMSStatus.length || selectedDMSStatus.includes(item['DMS status'])) &&
        // UCM Status 过滤
        (selectedUCMStatus === 'All' || item['UCM status'] === selectedUCMStatus) &&
        // WebUI Status 过滤
        (selectedWebUIStatus === 'All' || 
         item['WebUI status'] === webUIStatusMap[selectedWebUIStatus as keyof typeof webUIStatusMap]) &&
        // Apply To 过滤
        (applyToState.New === 'All' || 
         (applyToState.New === 'Yes' ? item['Can apply to new campaign'] === 'Can apply to new campaign' 
                                    : item['Can apply to new campaign'] === '-')) &&
        (applyToState.Existing === 'All' || 
         (applyToState.Existing === 'Yes' ? item['Can apply to existing campaign'] === 'Can apply to existing campaign'
                                        : item['Can apply to existing campaign'] === '-')) &&
        // Campaign Type 过滤
        (applyCampaignTypeState.Search === 'All' || 
         (applyCampaignTypeState.Search === 'Yes' ? item['Can apply to Search campaign'] === 'Can apply to Search campaign'
                                                 : item['Can apply to Search campaign'] === '-')) &&
        // ... 其他 Campaign Type 过滤条件 ...
        // Already Apply Type 过滤
        (alreadyApplyTypeState.Search === 'All' || 
         (alreadyApplyTypeState.Search === 'Yes' ? item['Already apply to Search campaign'] === 'Already apply to Search campaign'
                                                : item['Already apply to Search campaign'] === '-'))
        // ... 其他 Already Apply Type 过滤条件 ...
      );
    });

    return filtered;
  }, [
    fileData?.rows,
    selectedOwnerGPMs,
    selectedUCMDMS,
    selectedCampaignLevel,
    selectedDMSStatus,
    selectedUCMStatus,
    selectedWebUIStatus,
    applyToState,
    applyCampaignTypeState,
    alreadyApplyTypeState
  ]);

  // availableCards 直接使用 filteredData
  const availableCards = useMemo(() => {
    return filteredData.filter(card => 
      // 只过滤 Pillar 和 Category
      (!selectedPillar && !selectedCategory) || 
      (card.Pillar === selectedPillar && 
       (!selectedCategory || card.Category === selectedCategory))
    );
  }, [filteredData, selectedPillar, selectedCategory]);

  // 修改分组函数，先按 Category 分组，再按 Pillar 分组
  const groupSelectedCardsByCategory = useMemo(() => {
    const groups: Record<string, Record<string, CardWithWeight[]>> = {
      'Health check': {},
      'Feature adoption': {},
      'Recommendation': {}
    };

    selectedCards.forEach(card => {
      let category = 'Recommendation';
      if (card.Category?.toLowerCase().includes('health check')) {
        category = 'Health check';
      } else if (card.Category?.toLowerCase().includes('feature')) {
        category = 'Feature adoption';
      }

      const pillar = card.Pillar || 'Other';

      if (!groups[category][pillar]) {
        groups[category][pillar] = [];
      }
      groups[category][pillar].push(card);
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
      border: '1px solid #d9d9d9',
      borderRadius: '4px',
      padding: '12px',
      backgroundColor: 'white',
      cursor: 'grab',
      fontSize: '14px'
    }}>
      <div style={{
        color: '#333',
        marginBottom: '8px',
        fontSize: '15px',
        paddingRight: '24px',  // 为删除按钮留出空间
        display: '-webkit-box',
        WebkitLineClamp: '2',  // 最多显示两行
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.4'  // 设置行高
      }}>
        {card.Item}
      </div>
      <div style={{
        color: '#666',
        fontSize: '13px'
      }}>
        UCM DMS Weightage: {card['UCM DMS Weightage']}
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

  // 修改导航栏数据统计的计算逻辑
  const getFilteredCount = (pillar: string | null, category: string | null) => {
    if (!fileData?.rows) return 0;
    
    return fileData.rows.filter(card => {
      // Owner GPM 过滤
      if (selectedOwnerGPMs.length === 0) {
        return false;  // 如果没有选中任何 Owner GPM，直接返回 false
      }
      if (!card['Owner GPM'] || !selectedOwnerGPMs.includes(card['Owner GPM'])) {
        return false;
      }

      // UCM DMS 过滤
      if (selectedUCMDMS !== 'All') {
        if (selectedUCMDMS === 'Yes' ? card['UCM status'] !== 'Included in UCM DMS' 
                                    : card['UCM status'] === 'Included in UCM DMS') {
          return false;
        }
      }

      // Campaign Level 过滤
      if (selectedCampaignLevel !== 'All') {
        if (selectedCampaignLevel === 'Yes' ? card['Can apply to campaign level'] !== 'Can apply to campaign level'
                                          : card['Can apply to campaign level'] === 'Can apply to campaign level') {
          return false;
        }
      }

      // 其他基本过滤条件
      return (
        (!pillar || card.Pillar === pillar) &&
        (!category || card.Category === category) &&
        (!selectedDMSStatus.length || selectedDMSStatus.includes(card['DMS status'])) &&
        (selectedUCMStatus === 'All' || card['UCM status'] === selectedUCMStatus) &&
        (selectedWebUIStatus === 'All' || 
         card['WebUI status'] === webUIStatusMap[selectedWebUIStatus as keyof typeof webUIStatusMap]) &&
        // Apply To 过滤
        (applyToState.New === 'All' || 
         (applyToState.New === 'Yes' ? card['Can apply to new campaign'] === 'Can apply to new campaign' 
                                    : card['Can apply to new campaign'] === '-')) &&
        (applyToState.Existing === 'All' || 
         (applyToState.Existing === 'Yes' ? card['Can apply to existing campaign'] === 'Can apply to existing campaign'
                                        : card['Can apply to existing campaign'] === '-')) &&
        // Campaign Type 过滤
        (applyCampaignTypeState.Search === 'All' || 
         (applyCampaignTypeState.Search === 'Yes' ? card['Can apply to Search campaign'] === 'Can apply to Search campaign'
                                                 : card['Can apply to Search campaign'] === '-')) &&
        (applyCampaignTypeState.Pmax === 'All' || 
         (applyCampaignTypeState.Pmax === 'Yes' ? card['Can apply to Pmax campaign'] === 'Can apply to Pmax campaign'
                                               : card['Can apply to Pmax campaign'] === '-')) &&
        (applyCampaignTypeState.Shopping === 'All' || 
         (applyCampaignTypeState.Shopping === 'Yes' ? card['Can apply to Shopping campaign'] === 'Can apply to Shopping campaign'
                                                   : card['Can apply to Shopping campaign'] === '-')) &&
        (applyCampaignTypeState.DNV === 'All' || 
         (applyCampaignTypeState.DNV === 'Yes' ? card['Can apply to DNV campaign'] === 'Can apply to DNV campaign'
                                              : card['Can apply to DNV campaign'] === '-')) &&
        // Already Apply Type 过滤
        (alreadyApplyTypeState.Search === 'All' || 
         (alreadyApplyTypeState.Search === 'Yes' ? card['Already apply to Search campaign'] === 'Already apply to Search campaign'
                                                : card['Already apply to Search campaign'] === '-')) &&
        (alreadyApplyTypeState.Pmax === 'All' || 
         (alreadyApplyTypeState.Pmax === 'Yes' ? card['Already apply to Pmax campaign'] === 'Already apply to Pmax campaign'
                                              : card['Already apply to Pmax campaign'] === '-')) &&
        (alreadyApplyTypeState.Shopping === 'All' || 
         (alreadyApplyTypeState.Shopping === 'Yes' ? card['Already apply to Shopping campaign'] === 'Already apply to Shopping campaign'
                                                  : card['Already apply to Shopping campaign'] === '-')) &&
        (alreadyApplyTypeState.DNV === 'All' || 
         (alreadyApplyTypeState.DNV === 'Yes' ? card['Already apply to DNV campaign'] === 'Already apply to DNV campaign'
                                             : card['Already apply to DNV campaign'] === '-'))
      );
    }).length;
  };

  // 修改排序顺序的类型
  const order: CategoryOrder = {
    'Health check': 1,
    'Feature adoption': 2,
    'Tactic': 3
  };

  const handleSave = () => {
    if (!fileData || !selectedCards.length) return;

    const success = exportToCSV(fileData, selectedCards, originalFileName);
    
    if (success) {
      showToast('File saved successfully!');
    } else {
      showToast('Error saving file. Please try again.');
    }
  };

  // WebUI status 映射关系
  const webUIStatusMap = {
    'Available': 'WebUI Ready',
    'Partially available': 'WebUI Partially Ready',
    'Not available': 'WebUI Not Ready'
  } as const;

  // 首先添加一个函数来获取所有唯一的 Category
  const getUniqueCategories = (cards: CardWithWeight[]) => {
    const categories = new Set<string>();
    cards.forEach(card => {
      if (card.Category) {
        if (card.Category.toLowerCase().includes('health check')) {
          categories.add('Health check');
        } else if (card.Category.toLowerCase().includes('feature')) {
          categories.add('Feature adoption');
        } else {
          categories.add('Recommendation');
        }
      }
    });
    return Array.from(categories);
  };

  // 定义选中状态的样式常量
  const SELECTED_STYLE = {
    fontWeight: 500,  // 选中时字体加粗
    border: '2px solid #4CAF50',  // 绿色粗边框
    backgroundColor: '#f0fff0'  // 轻微的绿色背景
  };

  // 修改单选按钮样式
  const radioButtonStyle = (isSelected: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    cursor: 'pointer',
    backgroundColor: isSelected ? '#f0fff0' : 'white',
    borderRadius: '4px',
    border: isSelected ? '2px solid #4CAF50' : '1px solid #d9d9d9',
    fontWeight: isSelected ? 600 : 'normal',  // 改为 600 使文字加粗更明显
    '& span': {  // 选项文字的样式
      fontWeight: isSelected ? 600 : 'normal'  // 选中时文字加粗
    }
  });

  // 修改按钮样式
  const filterButtonStyle = (isSelected: boolean) => ({
    padding: '4px 12px',
    border: isSelected ? '2px solid #4CAF50' : '1px solid #d9d9d9',
    borderRadius: '4px',
    backgroundColor: isSelected ? '#f0fff0' : 'white',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#666',
    transition: 'all 0.2s',
    fontWeight: isSelected ? 600 : 'normal'  // 改为 600 使文字加粗更明显
  });

  // 在 handleWeightageChange 函数中添加验证和权重检查
  const handleWeightageChange = (cardItem: string, value: string) => {
    // 如果输入为空或0，直接设置为空字符串
    if (!value || value === '0') {
      setSelectedCards(prevCards =>
        prevCards.map(card =>
          card.Item === cardItem
            ? { ...card, weightage: '' }
            : card
        )
      );
      return;
    }

    // 只允许输入数字和小数点，且最多两位小数
    if (!/^\d*\.?\d{0,2}$/.test(value)) {
      return;
    }

    // 找到当前卡片和其所属的 Pillar
    const currentCard = selectedCards.find(card => card.Item === cardItem);
    if (!currentCard) return;

    const pillar = currentCard.Pillar;
    const maxWeight = WEIGHT_BUCKETS[pillar];
    
    // 计算当前 Pillar 已使用的权重（不包括当前卡片）
    const currentPillarWeight = selectedCards.reduce((sum, card) => {
      if (card.Pillar === pillar && card.Item !== cardItem && card.weightage) {
        return sum + parseFloat(card.weightage);
      }
      return sum;
    }, 0);

    // 检查新的权重是否会超过上限
    const newWeight = parseFloat(value);
    if (newWeight + currentPillarWeight <= maxWeight) {
      setSelectedCards(prevCards =>
        prevCards.map(card =>
          card.Item === cardItem
            ? { ...card, weightage: value }
            : card
        )
      );
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPillar: string) => {
    e.preventDefault();
    const cardData = JSON.parse(e.dataTransfer.getData('card'));
    
    setSelectedCards(prevCards => {
      // 检查卡片是否已经存在
      if (prevCards.some(card => card.Item === cardData.Item)) {
        return prevCards;
      }

      // 添加新卡片时不设置默认的 weightage 值
      return [...prevCards, {
        ...cardData,
        // 移除这里的默认值设置
        // weightage: '0'  // 删除这行
      }];
    });
  };

  // 修改 setSelectedOwnerGPMs 的处理逻辑
  const handleOwnerGPMClick = (owner: string) => {
    setSelectedOwnerGPMs(prev => {
      if (prev.includes(owner)) {
        // 如果移除后没有任何选中的 owner，返回空数组
        const newSelection = prev.filter(o => o !== owner);
        return newSelection.length === 0 ? [] : newSelection;
      }
      // 如果当前是空数组（即全不选状态），则只选中点击的这一个
      if (prev.length === 0) {
        return [owner];
      }
      // 否则添加到已选列表中
      return [...prev, owner];
    });
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
          {/* 隐藏上传提示和按钮 */}
          {/*
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
          */}

          {/* 保留保存按钮 */}
          <button 
            onClick={handleSave}
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

      {/* 过滤器区域 */}
      <div style={{ 
        marginTop: '24px',
        marginBottom: '32px',  // 增加底部间距
        display: 'flex',
        gap: '24px',
        backgroundColor: 'white',
        padding: '24px',  // 增加内部填充，从 16px 改为 24px
        borderRadius: '4px',
        border: '1px solid #e8e8e8'
      }}>
        {/* 每个过滤器的容器样式保持一致 */}
        <div style={{ 
          width: '200px',
          backgroundColor: 'white',  // 添加白色背景
          padding: '15px',  // 添加内边距
          borderRadius: '4px',  // 添加圆角
          border: '1px solid #eee'  // 添加边框
        }}>
          {/* 过滤器标题样式 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600，使标题更加粗
          }}>
            Owner GPM
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {ownerGPMOptions.map((owner: string) => (
              <button
                key={owner}
                onClick={() => handleOwnerGPMClick(owner)}
                style={{
                  padding: '8px 12px',
                  border: selectedOwnerGPMs.includes(owner) ? '2px solid #4CAF50' : '1px solid #d9d9d9',
                  borderRadius: '4px',
                  backgroundColor: selectedOwnerGPMs.includes(owner) ? '#f0fff0' : 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#666',
                  transition: 'all 0.3s',
                  textAlign: 'left',
                  width: '100%',
                  fontWeight: selectedOwnerGPMs.includes(owner) ? 600 : 'normal'
                }}
              >
                {owner}
              </button>
            ))}
          </div>
        </div>

        {/* 其他过滤器容器使用相同的样式 */}
        <div style={{ 
          width: '200px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          {/* Included in UCM DMS 过滤器内容 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Included in UCM DMS
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {['Yes', 'No', 'All'].map((option) => (
              <div
                key={option}
                onClick={() => setSelectedUCMDMS(option)}
                style={radioButtonStyle(selectedUCMDMS === option)}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: selectedUCMDMS === option ? '#1890ff' : '#d9d9d9',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {selectedUCMDMS === option && (
                    <div style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#1890ff',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {option}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          width: '200px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          {/* Can apply to campaign 过滤器内容 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Can apply to campaign
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {['Yes', 'No', 'All'].map((option) => (
              <div
                key={option}
                onClick={() => setSelectedCampaignLevel(option)}
                style={radioButtonStyle(selectedCampaignLevel === option)}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: selectedCampaignLevel === option ? '#1890ff' : '#d9d9d9',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {selectedCampaignLevel === option && (
                    <div style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#1890ff',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {option}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          width: '300px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          {/* Can apply to 过滤器内容 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Can apply to
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* New campaign 行 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                width: '120px',
                fontSize: '13px',
                color: '#666'
              }}>
                New campaign
              </span>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                {['Yes', 'No', 'All'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setApplyToState(prev => ({
                      ...prev,
                      New: option
                    }))}
                    style={filterButtonStyle(applyToState.New === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Existing campaign 行 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ 
                width: '120px',
                fontSize: '13px',
                color: '#666'
              }}>
                Existing campaign
              </span>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                {['Yes', 'No', 'All'].map((option) => (
                  <button
                    key={option}
                    onClick={() => setApplyToState(prev => ({
                      ...prev,
                      Existing: option
                    }))}
                    style={filterButtonStyle(applyToState.Existing === option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          width: '300px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          {/* Can apply to campaign type 过滤器内容 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Can apply to campaign type
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {['Search', 'Pmax', 'Shopping', 'DNV'].map((campaignType) => (
              <div key={campaignType} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  width: '120px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {campaignType} campaign
                </span>
                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  {['Yes', 'No', 'All'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setApplyCampaignTypeState(prev => ({
                        ...prev,
                        [campaignType]: option
                      }))}
                      style={filterButtonStyle(applyCampaignTypeState[campaignType] === option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ 
          width: '300px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          {/* Already apply to campaign type 过滤器内容 */}
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Already apply to campaign type
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {['Search', 'Pmax', 'Shopping', 'DNV'].map((campaignType) => (
              <div key={campaignType} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  width: '120px',
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {campaignType} campaign
                </span>
                <div style={{
                  display: 'flex',
                  gap: '8px'
                }}>
                  {['Yes', 'No', 'All'].map((option) => (
                    <button
                      key={option}
                      onClick={() => setAlreadyApplyTypeState(prev => ({
                        ...prev,
                        [campaignType]: option
                      }))}
                      style={filterButtonStyle(alreadyApplyTypeState[campaignType] === option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Already available on WebUI 过滤器 */}
        <div style={{ 
          width: '200px',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '4px',
          border: '1px solid #eee'
        }}>
          <h3 style={{ 
            margin: '0 0 12px 0',
            fontSize: '14px',
            color: '#666',
            fontWeight: 600  // 从 500 改为 600
          }}>
            Already available on WebUI
          </h3>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {['Available', 'Partially available', 'Not available', 'All'].map((option) => (
              <div
                key={option}
                onClick={() => setSelectedWebUIStatus(option)}
                style={radioButtonStyle(selectedWebUIStatus === option)}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: selectedWebUIStatus === option ? '#1890ff' : '#d9d9d9',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {selectedWebUIStatus === option && (
                    <div style={{
                      position: 'absolute',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#1890ff',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }} />
                  )}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: '#666'
                }}>
                  {option}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {fileData && (
        <>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '250px 400px 1fr',
            gap: '32px',
            flex: 1,
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* 左侧导航栏 */}
            <div style={{ 
              backgroundColor: 'white',
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid #e8e8e8'
            }}>
              {/* All items available on UCM */}
              <h3 style={{ 
                margin: '0',
                padding: '15px',
                fontSize: '16px',
                color: '#333',
                flexShrink: 0,
                backgroundColor: '#f9f9f9'
              }}>
                All components
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
                  backgroundColor: 'transparent',
                  borderBottom: '1px solid #ddd',
                  fontSize: '14px',
                  color: !selectedPillar && !selectedCategory ? '#0066cc' : '#666',
                  fontWeight: !selectedPillar && !selectedCategory ? 600 : 'normal',  // 改为 600 以确保加粗效果更明显
                  transition: 'all 0.2s'
                }}
              >
                All ({getFilteredCount(null, null)})
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
                      {pillar} ({getFilteredCount(pillar, null)})
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
                        {category} ({getFilteredCount(pillar, category)})
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Available Cards 区域 */}
            <div style={{ 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'white',  // 添加白色背景
              border: '1px solid #e8e8e8',  // 添加边框
              borderRadius: '4px'  // 添加圆角
            }}>
              {/* Available Cards */}
              <h3 style={{ 
                margin: '0',
                padding: '15px',
                fontSize: '16px',
                color: '#333',
                flexShrink: 0,
                backgroundColor: '#f9f9f9'  // 添加灰色背景
              }}>
                Available Cards
              </h3>
              
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
                    // 添加过滤条件：卡片不在已选择列表中
                    !selectedCards.some(selectedCard => selectedCard.Item === card.Item) &&
                    (selectedUCMStatus === 'All' || card['UCM status'] === selectedUCMStatus) &&
                    (selectedWebUIStatus === 'All' || card['WebUI status'] === selectedWebUIStatus)
                  )
                  .sort((a, b) => a.Item.localeCompare(b.Item))
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
              backgroundColor: 'white',  // 改为白色背景
              borderRadius: '4px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: '800px',
              border: '1px solid #e8e8e8'  // 添加边框
            }}>
              {/* Calculation 区域 */}
              <div style={{
                borderBottom: '1px solid #ddd'
              }}>
                {/* Weights Calculation */}
                <h3 style={{ 
                  margin: '0',
                  padding: '15px 24px',
                  fontSize: '16px',
                  color: '#333',
                  backgroundColor: '#f9f9f9',
                  borderBottom: '1px solid #e8e8e8'
                }}>
                  Weights Calculation
                </h3>
                
                {/* 权重计算内容区域 */}
                <div style={{
                  padding: '24px',  // 调整内容区域的内边距
                  display: 'grid',
                  gridTemplateColumns: '250px 1fr',
                  gap: '0',
                  position: 'relative'
                }}>
                  {/* Available Weights */}
                  <div style={{
                    paddingRight: '30px'  // 为分隔线留出空间
                  }}>
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
                          fontSize: '14px',  // 从 13px 增加到 14px
                          padding: '6px 12px',
                          backgroundColor: 'white',
                          borderRadius: '4px',
                          alignItems: 'center',
                          border: '1px solid #e0e0e0',
                          height: '26px'
                        }}>
                          <span>{bucket}</span>
                          <span>{weight.toFixed(2)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div style={{
                    position: 'absolute',
                    left: '250px',
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: '#e8e8e8'
                  }} />

                  {/* Selected Weights */}
                  <div style={{
                    paddingLeft: '30px'  // 为分隔线留出空间
                  }}>
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
                              fontSize: '14px',  // 从 13px 增加到 14px
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
                                    fontSize: '14px',  // 从 13px 改为 14px，与其他部分保持一致
                                    padding: '6px 12px',
                                    color: '#666',
                                    backgroundColor: 'white',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    minWidth: '140px',
                                    height: '26px',
                                    alignItems: 'center'
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

              {/* Selected Cards 内容区域 */}
              <div 
                style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '24px'
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const droppedCard = JSON.parse(e.dataTransfer.getData('text/plain'));
                  const isCardExists = selectedCards.some(card => card.Item === droppedCard.Item);
                  if (!isCardExists) {
                    setSelectedCards(prev => [...prev, { ...droppedCard, weightage: '0' }]);
                  }
                }}
              >
                {/* Selected Cards */}
                <h3 style={{ 
                  margin: '-24px -24px 24px -24px',  // 使用负边距扩展到边缘
                  padding: '15px 24px',  // 左右内边距与外部容器对齐
                  fontSize: '16px',
                  color: '#333',
                  backgroundColor: '#f9f9f9',
                  borderBottom: '1px solid #e8e8e8'
                }}>
                  Selected Cards
                </h3>

                {/* 三列布局容器 */}
                <div style={{
                  display: 'flex',
                  height: '100%',
                  position: 'relative'
                }}>
                  {/* Health check 列 */}
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#333' }}>
                      Health check
                    </h3>
                    {/* Health check 列的卡片列表 */}
                    {(() => {
                      // 首先获取该 category 下所有有卡片的 pillar
                      const pillarsWithCards = Object.entries(WEIGHT_BUCKETS)
                        .filter(([pillar]) => 
                          selectedCards.some(card => 
                            card.Pillar === pillar && 
                            card.Category?.toLowerCase().includes('health check')
                          )
                        );

                      return pillarsWithCards.map(([pillar], index) => {
                        const cardsInPillar = selectedCards.filter(card => 
                          card.Pillar === pillar && 
                          card.Category?.toLowerCase().includes('health check')
                        );
                        
                        if (cardsInPillar.length === 0) return null;
                        
                        // 只有当有多个 pillar 且不是第一个时才显示分隔线
                        const showDivider = pillarsWithCards.length > 1 && index > 0;
                        
                        return (
                          <div key={pillar}>
                            {showDivider && (
                              <div style={{
                                height: '1px',
                                backgroundColor: '#e8e8e8',
                                margin: '12px 0 36px'
                              }} />
                            )}
                            
                            <h4 style={{ 
                              margin: '0 0 16px 0',
                              fontSize: '14px',
                              color: '#666',
                              fontWeight: 'normal'
                            }}>
                              {pillar}
                            </h4>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '24px'
                            }}>
                              {cardsInPillar.map(card => (
                                <div key={card.Item}>
                                  {/* 卡片内容 */}
                                  <div style={{ position: 'relative' }}>
                                    {renderCard(card)}
                                    <button
                                      onClick={() => setSelectedCards(cards => 
                                        cards.filter(c => c.Item !== card.Item)
                                      )}
                                      style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#999'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* 权重输入框 */}
                                  <div style={{ 
                                    marginTop: '4px',
                                    padding: '4px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      Weightage:
                                    </span>
                                    <input
                                      type="text"
                                      pattern="\d*\.?\d{0,2}"
                                      value={card.weightage || ''}  // 使用空字符串代替0
                                      onChange={(e) => handleWeightageChange(card.Item, e.target.value)}
                                      style={{
                                        width: '60px',
                                        padding: '4px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        textAlign: 'right'  // 添加右对齐
                                      }}
                                    />
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      %
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 第一条分隔线 */}
                  <div style={{
                    width: '1px',
                    backgroundColor: '#e8e8e8',
                    margin: '0 24px'
                  }} />

                  {/* Feature adoption 列 */}
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#333' }}>
                      Feature adoption
                    </h3>
                    {(() => {
                      // 首先获取该 category 下所有有卡片的 pillar
                      const pillarsWithCards = Object.entries(WEIGHT_BUCKETS)
                        .filter(([pillar]) => 
                          selectedCards.some(card => 
                            card.Pillar === pillar && 
                            card.Category?.toLowerCase().includes('feature')
                          )
                        );

                      return pillarsWithCards.map(([pillar], index) => {
                        const cardsInPillar = selectedCards.filter(card => 
                          card.Pillar === pillar && 
                          card.Category?.toLowerCase().includes('feature')
                        );
                        
                        if (cardsInPillar.length === 0) return null;
                        
                        // 只有当有多个 pillar 且不是第一个时才显示分隔线
                        const showDivider = pillarsWithCards.length > 1 && index > 0;
                        
                        return (
                          <div key={pillar}>
                            {showDivider && (
                              <div style={{
                                height: '1px',
                                backgroundColor: '#e8e8e8',
                                margin: '12px 0 36px'
                              }} />
                            )}
                            
                            <h4 style={{ 
                              margin: '0 0 16px 0',
                              fontSize: '14px',
                              color: '#666',
                              fontWeight: 'normal'
                            }}>
                              {pillar}
                            </h4>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '24px'
                            }}>
                              {cardsInPillar.map(card => (
                                <div key={card.Item}>
                                  {/* 卡片内容 */}
                                  <div style={{ position: 'relative' }}>
                                    {renderCard(card)}
                                    <button
                                      onClick={() => setSelectedCards(cards => 
                                        cards.filter(c => c.Item !== card.Item)
                                      )}
                                      style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#999'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* 权重输入框 */}
                                  <div style={{ 
                                    marginTop: '4px',
                                    padding: '4px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      Weightage:
                                    </span>
                                    <input
                                      type="text"
                                      pattern="\d*\.?\d{0,2}"
                                      value={card.weightage || ''}  // 使用空字符串代替0
                                      onChange={(e) => handleWeightageChange(card.Item, e.target.value)}
                                      style={{
                                        width: '60px',
                                        padding: '4px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        textAlign: 'right'  // 添加右对齐
                                      }}
                                    />
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      %
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 第二条分隔线 */}
                  <div style={{
                    width: '1px',
                    backgroundColor: '#e8e8e8',
                    margin: '0 24px'
                  }} />

                  {/* Recommendation 列 */}
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', color: '#333' }}>
                      Recommendation
                    </h3>
                    {(() => {
                      // 首先获取该 category 下所有有卡片的 pillar
                      const pillarsWithCards = Object.entries(WEIGHT_BUCKETS)
                        .filter(([pillar]) => 
                          selectedCards.some(card => 
                            card.Pillar === pillar && 
                            !card.Category?.toLowerCase().includes('health check') &&
                            !card.Category?.toLowerCase().includes('feature')
                          )
                        );

                      return pillarsWithCards.map(([pillar], index) => {
                        const cardsInPillar = selectedCards.filter(card => 
                          card.Pillar === pillar && 
                          !card.Category?.toLowerCase().includes('health check') &&
                          !card.Category?.toLowerCase().includes('feature')
                        );
                        
                        if (cardsInPillar.length === 0) return null;
                        
                        // 只有当有多个 pillar 且不是第一个时才显示分隔线
                        const showDivider = pillarsWithCards.length > 1 && index > 0;
                        
                        return (
                          <div key={pillar}>
                            {showDivider && (
                              <div style={{
                                height: '1px',
                                backgroundColor: '#e8e8e8',
                                margin: '12px 0 36px'
                              }} />
                            )}
                            
                            <h4 style={{ 
                              margin: '0 0 16px 0',
                              fontSize: '14px',
                              color: '#666',
                              fontWeight: 'normal'
                            }}>
                              {pillar}
                            </h4>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '24px'
                            }}>
                              {cardsInPillar.map(card => (
                                <div key={card.Item}>
                                  {/* 卡片内容 */}
                                  <div style={{ position: 'relative' }}>
                                    {renderCard(card)}
                                    <button
                                      onClick={() => setSelectedCards(cards => 
                                        cards.filter(c => c.Item !== card.Item)
                                      )}
                                      style={{
                                        position: 'absolute',
                                        top: '8px',
                                        right: '8px',
                                        border: 'none',
                                        background: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        color: '#999'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                  {/* 权重输入框 */}
                                  <div style={{ 
                                    marginTop: '4px',
                                    padding: '4px 12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}>
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      Weightage:
                                    </span>
                                    <input
                                      type="text"
                                      pattern="\d*\.?\d{0,2}"
                                      value={card.weightage || ''}  // 使用空字符串代替0
                                      onChange={(e) => handleWeightageChange(card.Item, e.target.value)}
                                      style={{
                                        width: '60px',
                                        padding: '4px',
                                        border: '1px solid #d9d9d9',
                                        borderRadius: '4px',
                                        textAlign: 'right'  // 添加右对齐
                                      }}
                                    />
                                    <span style={{
                                      fontSize: '14px',
                                      color: '#666',
                                      flexShrink: 0
                                    }}>
                                      %
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
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

      {/* 添加全局样式 */}
      <style>
        {`
          input[type="number"]::-webkit-outer-spin-button,
          input[type="number"]::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `}
      </style>
    </div>
  );
}

export default App; 