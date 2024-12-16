const myAsyncFunc = async () => {
  console.log('My async func');
};

myAsyncFunc().then(() => {
  console.log('should not require commonJS during transpilation');
});
