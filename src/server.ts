import app from './app';

const PORT = parseInt(process.env.PORT || '3000', 10);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 服务器运行在端口 ${PORT}`);
  const host = process.env.SERVER_HOST || 'localhost';
  console.log(`📍 访问地址: http://${host}:${PORT}`);
});
