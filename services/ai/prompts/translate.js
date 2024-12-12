/**
 * 翻译的提示词模板
 */
export default {
    // 提示词模板函数
    template: ({ text, targetLang = 'zh', style = 'normal' }) => {
        const styleGuide = {
            normal: '使用自然、流畅的语言',
            formal: '使用正式、书面的语言',
            casual: '使用轻松、口语化的语言'
        };

        return `
请将以下文本翻译成${targetLang === 'zh' ? '中文' : '英文'}。
${styleGuide[style]}，保持原文的意思和语气。

原文：
${text}
`;
    },
    
    // 默认选项
    options: {
        temperature: 0.3,  // 翻译需要更确定性的输出
        max_tokens: 1000,
        model: 'gpt-3.5-turbo'  // 或其他支持的模型
    }
};
