/**
 * 文本总结的提示词模板
 */
export default {
    // 提示词模板函数
    template: ({ text, maxLength = 100, language = 'zh' }) => {
        return `
请将以下文本总结为不超过${maxLength}字的简短摘要。
保持原文的主要观点和关键信息。
使用${language === 'zh' ? '中文' : '英文'}回答。

原文：
${text}
`;
    },
    
    // 默认选项
    options: {
        temperature: 0.7,
        max_tokens: 500,
        model: 'gpt-3.5-turbo'  // 或其他支持的模型
    }
};
