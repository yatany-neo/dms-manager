import { useState, useMemo } from 'react';

interface FileData {
  headers: string[];
  rows: any[];
}

interface GroupedCards {
  [pillar: string]: {
    [category: string]: any[];
  };
}

interface CardWithWeight extends Record<string, any> {
  weightage?: number;
}

function App() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [selectedCards, setSelectedCards] = useState<CardWithWeight[]>([]);
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // 对可用卡片进行分组，排除已选择的卡片
  const groupedCards = useMemo(() => {
    if (!fileData) return {};
    
    return fileData.rows
      .filter(row => !selectedCards.some(selected => 
        JSON.stringify(selected) === JSON.stringify(row)
      ))
      .reduce((groups: GroupedCards, row) => {
        const pillar = row.Pillar || 'Other';
        const category = row.Category || 'Other';
        
        if (!groups[pillar]) {
          groups[pillar] = {};
        }
        if (!groups[pillar][category]) {
          groups[pillar][category] = [];
        }
        
        groups[pillar][category].push(row);
        return groups;
      }, {});
  }, [fileData, selectedCards]);

  // 对已选卡片进行分组
  const groupedSelectedCards = useMemo(() => {
    return selectedCards.reduce((groups: GroupedCards, card) => {
      const pillar = card.Pillar || 'Other';
      const category = card.Category || 'Other';
      
      if (!groups[pillar]) {
        groups[pillar] = {};
      }
      if (!groups[pillar][category]) {
        groups[pillar][category] = [];
      }
      
      groups[pillar][category].push(card);
      return groups;
    }, {});
  }, [selectedCards]);

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        const rows = lines.slice(1).map(line => {
          const values = line.split(',');
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim();
            return obj;
          }, {} as any);
        });
        setFileData({ headers, rows });
        setExpandedPillars(new Set(Object.keys(groupedCards)));
      };
      reader.readAsText(file);
    }
  };

  // 移除已选卡片
  const removeSelectedCard = (cardToRemove: any) => {
    setSelectedCards(selectedCards.filter(card => 
      JSON.stringify(card) !== JSON.stringify(cardToRemove)
    ));
  };

  // 切换 Pillar 展开/折叠状态
  const togglePillar = (pillar: string) => {
    const newExpanded = new Set(expandedPillars);
    if (newExpanded.has(pillar)) {
      newExpanded.delete(pillar);
    } else {
      newExpanded.add(pillar);
    }
    setExpandedPillars(newExpanded);
  };

  // 切换 Category 展开/折叠状态
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // 更新 updateCardWeight 函数
  const updateCardWeight = (card: CardWithWeight, input: string) => {
    // 移除所有非数字字符
    const cleanValue = input.replace(/\D/g, '');
    
    // 如果输入为空，重置权重
    if (!cleanValue) {
      setSelectedCards(prevCards => {
        // 创建一个新数组，保持原有顺序
        return prevCards.map(c => {
          if (JSON.stringify(c) === JSON.stringify(card)) {
            const { weightage, ...rest } = c; // 移除 weightage
            return rest;
          }
          return c;
        });
      });
      return;
    }

    // 转换为整数
    const numericWeight = parseInt(cleanValue, 10);
    
    // 验证数值范围
    if (isNaN(numericWeight) || numericWeight > 100) return;
    
    // 更新状态，保持原有顺序
    setSelectedCards(prevCards => {
      return prevCards.map(c => {
        if (JSON.stringify(c) === JSON.stringify(card)) {
          return { ...c, weightage: numericWeight };
        }
        return c;
      });
    });
  };

  // 添加重置权重的函数
  const resetWeight = (card: CardWithWeight) => {
    setSelectedCards(cards =>
      cards.map(c =>
        JSON.stringify(c) === JSON.stringify(card)
          ? { ...c, weightage: undefined }
          : c
      )
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>DMS Card Manager</h1>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload}
        style={{ marginBottom: '20px' }}
      />
      
      {fileData && (
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          {/* 可用卡片列表区域 */}
          <div style={{ flex: 1 }}>
            <h2>Available Cards</h2>
            {Object.entries(groupedCards).map(([pillar, categories]) => (
              <div key={pillar} style={{ marginBottom: '20px' }}>
                <div 
                  onClick={() => togglePillar(pillar)}
                  style={{ 
                    backgroundColor: '#f0f0f0', 
                    padding: '10px', 
                    borderRadius: '4px',
                    marginBottom: '15px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <h3 style={{ margin: 0 }}>{pillar}</h3>
                  <span style={{ fontSize: '20px' }}>
                    {expandedPillars.has(pillar) ? '▼' : '▶'}
                  </span>
                </div>
                {expandedPillars.has(pillar) && Object.entries(categories).map(([category, cards]) => (
                  <div key={category} style={{ marginBottom: '20px', marginLeft: '20px' }}>
                    <div
                      onClick={() => toggleCategory(category)}
                      style={{ 
                        color: '#666', 
                        borderBottom: '1px solid #ddd',
                        paddingBottom: '5px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <h4 style={{ margin: 0 }}>{category}</h4>
                      <span style={{ fontSize: '16px' }}>
                        {expandedCategories.has(category) ? '▼' : '▶'}
                      </span>
                    </div>
                    {expandedCategories.has(category) && (
                      <div style={{ 
                        display: 'grid', 
                        gap: '10px', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))'
                      }}>
                        {cards.map((card, index) => (
                          <div
                            key={index}
                            style={{
                              padding: '10px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: 'move',
                              backgroundColor: 'white',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              width: '200px',
                              minWidth: '200px',
                              maxWidth: '200px'
                            }}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify(card));
                            }}
                          >
                            {Object.entries(card).map(([key, value]) => (
                              key !== 'Pillar' && key !== 'Category' ? (
                                <div key={key} style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  <strong>{key}:</strong> {value}
                                </div>
                              ) : null
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* 已选卡片区域 */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              border: '2px dashed #ccc',
              borderRadius: '4px',
              minHeight: '300px',
              backgroundColor: '#f5f5f5'
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const data = JSON.parse(e.dataTransfer.getData('text/plain'));
              if (!selectedCards.some(card => JSON.stringify(card) === JSON.stringify(data))) {
                setSelectedCards([...selectedCards, data]);
              }
            }}
          >
            <h2>Selected Cards</h2>
            {Object.entries(groupedSelectedCards).map(([pillar, categories]) => (
              <div key={pillar} style={{ marginBottom: '20px' }}>
                <div 
                  style={{ 
                    backgroundColor: '#e0e0e0', 
                    padding: '10px', 
                    borderRadius: '4px',
                    marginBottom: '15px',
                  }}
                >
                  <h3 style={{ margin: 0 }}>{pillar}</h3>
                </div>
                {Object.entries(categories).map(([category, cards]) => (
                  <div key={category} style={{ marginBottom: '20px', marginLeft: '20px' }}>
                    <div
                      style={{ 
                        color: '#666', 
                        borderBottom: '1px solid #ddd',
                        paddingBottom: '5px',
                        marginBottom: '10px',
                      }}
                    >
                      <h4 style={{ margin: 0 }}>{category}</h4>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gap: '20px',
                      gridTemplateColumns: 'repeat(auto-fill, 320px)'
                    }}>
                      {cards.map((card, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                            width: '100%'
                          }}
                        >
                          <div
                            style={{
                              width: '240px',
                              padding: '12px',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              backgroundColor: 'white',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              position: 'relative'
                            }}
                          >
                            <button
                              onClick={() => removeSelectedCard(card)}
                              style={{
                                position: 'absolute',
                                right: '5px',
                                top: '5px',
                                background: '#ff4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                zIndex: 1
                              }}
                            >
                              ×
                            </button>
                            <div style={{ paddingRight: '15px' }}>
                              {Object.entries(card).map(([key, value]) => (
                                key !== 'Pillar' && key !== 'Category' && key !== 'weightage' ? (
                                  <div key={key} style={{ 
                                    marginBottom: '8px',
                                    fontSize: '13px',
                                    lineHeight: '1.4'
                                  }}>
                                    <strong>{key}:</strong> {value}
                                  </div>
                                ) : null
                              ))}
                            </div>
                          </div>
                          
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
                                onChange={(e) => updateCardWeight(card, e.target.value)}
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
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 