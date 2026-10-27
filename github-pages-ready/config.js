// FormSubmit 无需注册。不要填写邮箱密码或 SMTP 授权码。
window.DATE_CONFIG = Object.freeze({
  formEndpoint: 'https://formsubmit.co/ajax/3099976033@qq.com', // https://formsubmit.co/ajax/你的QQ邮箱 或激活后的随机标识
  emailActivated: true, // 完成邮箱激活后改为 true，再测试实际到信
  timeZone: 'Asia/Shanghai',
  // 每小时一个选项；24:00 表示当天结束（次日 00:00）。
  times: Array.from({ length: 19 }, (_, index) => `${String(index + 6).padStart(2, '0')}:00`)
});
