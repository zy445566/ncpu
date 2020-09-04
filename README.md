# ncpu
node.js run function worker threads library

# install 
```sh
npm install ncpu
```

# example
```js
import {NCPU} from 'ncpu' // or const {NCPU} = require('ncpu')
async function main () {
  // ### run
  await NCPU.run((a,b)=>a+b,[1,2]) // result: 3
  await NCPU.run((list)=>{
      return list.reduce((total,value)=>{return total+value;});
  },[[1,2,3]]) // result: 6
  // ### pick
  const workerFibo = await NCPU.pick((num)=>{
      const fibo = (value)=>{
          if(value<=2){return 1;}
          return fibo(value-2)+fibo(value-1);
      }
      return fibo(num);
  });
  // slef time to run
  await workerFibo(38)+await workerFibo(39) // result: 102334155 //fibo(40)
}
main()
```
