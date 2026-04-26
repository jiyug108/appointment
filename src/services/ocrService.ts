export interface IdCardInfo {
  name: string;
  idNumber: string;
  birthDate: string;
}

/**
 * OCR 识别方案 - 调用服务端 API
 * 服务端使用 Gemini 1.5 Flash 动力
 */
export async function parseIdCard(base64Data: string, mimeType: string = 'image/jpeg'): Promise<IdCardInfo> {
  try {
    const response = await fetch('/api/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Data,
        mimeType: mimeType
      }),
    });

    if (!response.ok) {
      throw new Error('网络请求失败');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '识别失败');
    }

    return {
      name: data.name || '',
      idNumber: data.idNumber || '',
      birthDate: data.birthDate || ''
    };
  } catch (error) {
    console.error('OCR Service Error:', error);
    throw new Error('证件识别失败，请尝试手动输入或重新拍照。');
  }
}
