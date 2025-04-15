import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  console.log('WhenToOff 扩展已激活');

  // 创建状态栏项（显示在右侧，优先级越大越靠左）
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 首次更新状态栏显示
  updateStatusBarItem();

  const timer = setInterval(updateStatusBarItem, 150);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  // 监听配置变化，实时更新显示内容
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('whentooff')) {
      updateStatusBarItem();
    }
  }));
}

/**
 * 根据配置和当前时间更新状态栏显示
 */
function updateStatusBarItem() {
  // 读取配置
  const config = vscode.workspace.getConfiguration('whentooff');
  const dailyWage = config.get<number>('dailyWage', 200);
  const startTimeStr = config.get<string>('startTime', '09:00');
  const endTimeStr = config.get<string>('endTime', '18:00');
  const workingDays = config.get<string[]>('workingDays', ['周一', '周二', '周三', '周四', '周五']);
  const currency = config.get<string>('currency', '￥');
  const notStartedText = config.get<string>('notStartedText', '牛马准备');
  const finishedText = config.get<string>('finishedText', '今日目标已完成 赶紧下班吧！');
  const statusTemplate = config.get<string>('statusTemplate', '${progressBar}  ${earned}${currency} ${percentage}%');

  const now = new Date();

  // 使用中文星期名称，与用户配置对应
  const dayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const todayName = dayNames[now.getDay()];

  // 如果今日不在工作日列表，则隐藏状态栏项
  if (!workingDays.includes(todayName)) {
    statusBarItem.hide();
    return;
  } else {
    statusBarItem.show();
  }

  // 解析上班和下班时间（格式为 "HH:MM"）
  const [startHour, startMinute] = startTimeStr.split(":").map(Number);
  const [endHour, endMinute] = endTimeStr.split(":").map(Number);
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute);
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute);

  if (now < startDate) {
    // 上班前：显示独立配置的提示文本
    statusBarItem.text = notStartedText;
    statusBarItem.tooltip = "";
  } else if (now >= startDate && now <= endDate) {
    // 工作时间内：计算并显示进度信息
    const fraction = (now.getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime());
    const percentage = (fraction * 100).toFixed(4);
    const earned = (dailyWage * fraction).toFixed(4);
    const progressBar = getProgressBar(fraction * 100);

    // 根据用户配置的模板替换变量
    let statusText = statusTemplate;
    statusText = statusText.replace(/\$\{progressBar\}/g, progressBar);
    statusText = statusText.replace(/\$\{earned\}/g, earned);
    statusText = statusText.replace(/\$\{currency\}/g, currency);
    statusText = statusText.replace(/\$\{percentage\}/g, percentage);

    statusBarItem.text = statusText;
    statusBarItem.tooltip = "工作时间进度";
  } else {
    // 超过下班时间：显示独立配置的提示文本
    statusBarItem.text = finishedText;
    statusBarItem.tooltip = "";
  }
}

/**
 * 根据百分比生成10格进度条字符串
 * @param percent 进度百分比（0~100）
 */
function getProgressBar(percent: number): string {
  const totalSegments = 10;
  const completeSegments = Math.floor(percent / (100 / totalSegments));
  const incompleteSegments = totalSegments - completeSegments;
  return '▰'.repeat(completeSegments) + '▱'.repeat(incompleteSegments);
}

export function deactivate() {}