interface ExportData {
  headers: string[];
  rows: Record<string, any>[];
}

interface SelectedCard {
  Item: string;
  weightage?: string;
}

export const exportToCSV = (
  fileData: ExportData,
  selectedCards: SelectedCard[],
  originalFileName: string  // 保留参数但不使用
) => {
  try {
    console.log('Export started with:', {
      headers: fileData.headers,
      selectedCardsCount: selectedCards.length
    });

    // 1. 只导出选中的卡片
    const exportRows = selectedCards.map(selectedCard => {
      // 找到对应的原始数据行
      const originalRow = fileData.rows.find(row => row.Item === selectedCard.Item);
      
      if (!originalRow) {
        console.error(`Cannot find original data for card: ${selectedCard.Item}`);
        return null;
      }

      // 创建新对象，复制所有原始字段
      const newRow = { ...originalRow };
      
      // 更新 WebUI Weightage，确保添加百分号并格式化为两位小数
      newRow['WebUI Weightage'] = selectedCard.weightage 
        ? `${parseFloat(selectedCard.weightage).toFixed(2)}%` 
        : '';

      return newRow;
    }).filter((row): row is Record<string, string> => row !== null);  // 移除可能的 null 值并确保类型安全

    // 2. 生成 CSV 内容
    const csvContent = [
      fileData.headers.join(','),
      ...exportRows.map(row => 
        fileData.headers.map(header => {
          const value = (row[header] || '').toString();
          // 处理包含特殊字符的值
          return value.includes(',') || value.includes('"') || value.includes('\n')
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    console.log('Generated CSV rows count:', exportRows.length);

    // 3. 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'new_configuration_file.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return false;
  }
}; 