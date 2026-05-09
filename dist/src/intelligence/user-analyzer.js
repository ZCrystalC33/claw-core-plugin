/**
 * ZCrystal User Analyzer
 * Analyzes user communication patterns from stored traces
 */
export class UserAnalyzer {
    traces = [];
    constructor(traces) {
        this.traces = traces;
    }
    analyze() {
        const totalTraces = this.traces.length;
        const skillsUsed = {};
        let successCount = 0;
        let lastActive = 0;
        for (const trace of this.traces) {
            skillsUsed[trace.skill] = (skillsUsed[trace.skill] || 0) + 1;
            if (trace.success)
                successCount++;
            if (trace.timestamp > lastActive)
                lastActive = trace.timestamp;
        }
        const detailsLengths = this.traces
            .filter(t => t.details)
            .map(t => t.details.length);
        const avgLength = detailsLengths.length > 0
            ? detailsLengths.reduce((a, b) => a + b, 0) / detailsLengths.length
            : 0;
        let communicationStyle = 'mixed';
        if (avgLength < 50)
            communicationStyle = 'concise';
        else if (avgLength > 200)
            communicationStyle = 'detailed';
        return {
            totalTraces,
            skillsUsed,
            successRate: totalTraces > 0 ? successCount / totalTraces : 0,
            lastActive,
            communicationStyle,
            messageCount: this.traces.length
        };
    }
    generateSummary() {
        const profile = this.analyze();
        if (profile.totalTraces === 0) {
            return '尚無足夠資料分析用戶模型。繼續對話來建立您的使用習慣檔案。';
        }
        const styleText = {
            concise: '簡潔明瞭',
            detailed: '詳細豐富',
            mixed: '彈性多變'
        }[profile.communicationStyle];
        const topSkills = Object.entries(profile.skillsUsed)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([skill, count]) => skill + ' (' + count + '次)')
            .join(', ');
        const lastActiveDate = new Date(profile.lastActive).toLocaleString('zh-TW');
        return '📊 用戶分析報告\n\n' +
            '| 指標 | 數值 |\n' +
            '|------|------|\n' +
            '| 總記錄數 | ' + profile.totalTraces + ' |\n' +
            '| 成功率 | ' + (profile.successRate * 100).toFixed(1) + '% |\n' +
            '| 溝通風格 | ' + styleText + ' |\n' +
            '| 常用技能 | ' + (topSkills || '尚無') + ' |\n' +
            '| 最近活躍 | ' + lastActiveDate + ' |\n\n' +
            '這個分析會隨著您的使用而持續更新。';
    }
}
//# sourceMappingURL=user-analyzer.js.map