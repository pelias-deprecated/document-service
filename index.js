try {
  const app = require('./app')(process.argv[2]);
  const port = ( parseInt(process.env.PORT) || 5000 );

  app.listen(port, () => {
    console.log(`document-generator is now running on port ${port}`);
  });

} catch (err) {
  console.error(err);
  process.exit(1);

}
