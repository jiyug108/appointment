export interface IdCardInfo {
  name: string;
  idNumber: string;
  birthDate: string;
}

/**
 * OCR 识别方案 - 调用后端 System Tesseract 引擎
 * 这种方案比 Tesseract.js 更快、更准确，且完全离线运行在服务器上。
 */
export async function parseIdCard(base64Data: string, mimeType: string = 'image/jpeg'): Promise<IdCardInfo> {
  try {
    // 将 base64 转换为 Blob 然后发送
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeType });
    
    const formData = new FormData();
    formData.append('image', blob, 'idcard.jpg');

    const response = await fetch('/api/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) throw new Error('OCR API failed');
    
    const result = await response.json();
    
    if (!result.success) throw new Error(result.error || '识别失败');

    return {
      name: result.name || '',
      idNumber: result.idNumber || '',
      birthDate: result.birthDate || ''
    };
  } catch (error) {
    console.error('Remote OCR Error:', error);
    throw new Error('识别失败，请检查图片清晰度并确保服务器环境可正常运行 OCR 引擎');
  }
}
