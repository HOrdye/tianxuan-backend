import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  console.log(`📍 访问地址: http://49.232.243.107:${PORT}`);
});
