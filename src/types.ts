export interface Card {
  Item: string;
  Pillar: string;
  Category: string;
  'UCM status': string;
  'WebUI status': string;
  'UCM DMS Weightage': string;
  'DMS status': string;
  'UCM DMS': string;
  'Tactic code': string;
  
  // 重命名的字段
  'Can apply to account level': string;           // 原 Account
  'Can apply to manager account level': string;   // 原 Manager Account
  'Can apply to campaign level': string;          // 原 Campaign
  'Can apply to new campaign': string;            // 原 Creation
  'Can apply to existing campaign': string;       // 原 Existing campaign
  'Notes about UI availability': string;          // 原 Notes
  
  // 新增字段
  'Can apply to Search campaign': string;
  'Can apply to Pmax campaign': string;
  'Can apply to Shopping campaign': string;
  'Can apply to DNV campaign': string;
  'Already apply to Search campaign': string;
  'Already apply to Pmax campaign': string;
  'Already apply to Shopping campaign': string;
  'Already apply to DNV campaign': string;
  'Owner GPM': string;
  'Notes about applicable level': string;
  'Notes about campaign coverage': string;
  
  weightage?: string;
  [key: string]: string | undefined;  // 保持索引签名
} 