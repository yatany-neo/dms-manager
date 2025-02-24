import React, { useState } from 'react';

interface NavigationBarProps {
  data: {
    [pillar: string]: {
      [category: string]: number;
    };
  };
  onSelect: (pillar: string | null, category: string | null) => void;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ data, onSelect }) => {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleClick = (pillar: string | null, category: string | null) => {
    if (selectedPillar === pillar && selectedCategory === category) {
      setSelectedPillar(null);
      setSelectedCategory(null);
      onSelect(null, null);
    } else {
      setSelectedPillar(pillar);
      setSelectedCategory(category);
      onSelect(pillar, category);
    }
  };

  return (
    <div style={{
      width: '250px',
      backgroundColor: '#f5f5f5',
      borderRadius: '4px',
      padding: '16px'
    }}>
      <div 
        onClick={() => handleClick(null, null)}
        style={{ 
          marginBottom: '16px',
          cursor: 'pointer',
          color: !selectedPillar && !selectedCategory ? '#1890ff' : '#666'
        }}
      >
        <div style={{ 
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          All
        </div>
      </div>

      {Object.entries(data).map(([pillar, categories]) => (
        <div key={pillar} style={{ marginBottom: '16px' }}>
          <div 
            onClick={() => handleClick(pillar, null)}
            style={{ 
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: selectedPillar === pillar && !selectedCategory ? '#1890ff' : 'inherit'
            }}
          >
            {pillar} <span>({Object.values(categories).reduce((a, b) => a + b, 0)})</span>
          </div>
          {Object.entries(categories).map(([category, count]) => (
            <div 
              key={category}
              onClick={() => handleClick(pillar, category)}
              style={{ 
                marginLeft: '16px',
                marginTop: '8px',
                fontSize: '13px',
                color: selectedPillar === pillar && selectedCategory === category ? '#1890ff' : '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              {category} <span>({count})</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default NavigationBar; 