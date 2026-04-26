export interface IdCardInfo {
  name: string;
  idNumber: string;
  birthDate: string;
}

let isOcrInitialized = false;

/**
 * OCR 识别方案 - 使用 PaddleOCR (Paddle.js)
 * 这比 Tesseract.js 对中文识别更准确
 */
export async function parseIdCard(base64Data: string, mimeType: string = 'image/jpeg'): Promise<IdCardInfo> {
  try {
    // 确保 Wasm 需要的变量存在
    (window as any).Module = (window as any).Module || {};
    
    // 动态导入以避免初始加载错误
    const paddleOcr = await import('@paddlejs-models/ocr');
    
    // 获取实际的 ocr 对象 (umd 可能在 default 或者是导出的全部)
    const ocrObj: any = (paddleOcr as any).default || paddleOcr;

    if (!isOcrInitialized) {
      if (ocrObj.init) {
        await ocrObj.init();
      }
      isOcrInitialized = true;
    }

    // 将 base64 转换为 HTMLImageElement 以供 Paddle.js 识别
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Data}`;
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      // 超时处理
      setTimeout(() => reject(new Error('图片加载超时')), 10000);
    });

    const res = await ocrObj.recognize(img);
    
    // PaddleOCR returns text lines, but let's be robust
    let textLines: string[] = [];
    if (Array.isArray(res)) {
      textLines = res;
    } else if (res && typeof res === 'object' && Array.isArray(res.text)) {
      textLines = res.text;
    } else if (res && typeof res === 'string') {
      textLines = [res];
    }

    const fullText = textLines.join('');
    const textSanitized = fullText.replace(/\s+/g, '');

    console.log('PaddleOCR Result lines:', textLines);
    console.log('PaddleOCR Full text:', fullText);

    if (textLines.length === 0 && !fullText) {
      throw new Error('PaddleOCR empty result');
    }

    // 提取身份证信息
    let name = '';
    // 身份证姓名通常在开头，或者跟在“姓名”后面
    // 同时也识别可能的误识，如“姓夕”、“姓多”、“名”
    const nameMatch = textSanitized.match(/(?:姓名|姓夕|姓多|名|姓)[:：]?([\u4e00-\u9fa5]{2,4})/);
    if (nameMatch) {
      name = nameMatch[1].trim();
    } else {
      // 备选方案：查找性别或民族前的汉字
      const genderMatch = textSanitized.match(/([\u4e00-\u9fa5]{2,4})(?=性别|男|女|民族|族)/);
      if (genderMatch) {
        name = genderMatch[1].trim();
      } else {
        // 如果都没匹配到，尝试在全文中寻找最像名字的部分 (2-4个连续汉字，且在 ID 前面)
        const idIndex = textSanitized.search(/\d{15,18}/);
        const preIdText = idIndex > 0 ? textSanitized.substring(0, idIndex) : textSanitized;
        const fallbackNameMatch = preIdText.match(/([\u4e00-\u9fa5]{2,4})/);
        if (fallbackNameMatch) {
          name = fallbackNameMatch[1].trim();
        }
      }
    }

    const idMatch = textSanitized.match(/(\d{17}[\dXx])/);
    let idNumber = idMatch ? idMatch[0] : '';
    let birthDate = '';
    
    if (idNumber) {
      birthDate = `${idNumber.substring(6, 10)}-${idNumber.substring(10, 12)}-${idNumber.substring(12, 14)}`;
    }

    return {
      name: name,
      idNumber: idNumber,
      birthDate: birthDate
    };
  } catch (error) {
    console.error('PaddleOCR Error, falling back to Server OCR:', error);
    // Fallback to Server OCR if Paddle.js fails
    return fallbackToServerOcr(base64Data, mimeType);
  }
}

async function fallbackToServerOcr(base64Data: string, mimeType: string): Promise<IdCardInfo> {
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
}
