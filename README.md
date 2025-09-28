# ncpu
multi-threaded library that node.js run function worker

# Installation 
```sh
npm install ncpu
```
[ncpu](https://github.com/zy445566/ncpu) for the **`node.js`** environment,use [ncpu-web](https://github.com/zy445566/ncpu-web) for the **`browser`** environment.


`require:Node.js version>=12`


# Attention
Because it is multithreaded, context information cannot be received and parameter passing can only be achieved by cloning(
The cloning will occur as described in the [HTML structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm), and an error will be thrown if the object cannot be cloned (e.g. because it contains functions)).

# Quick Start
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
    // ### getWorkerPool // reuse a thread
    const ncpuWorkerPool = NCPU.getWorkerPool(); 
    const multiplexingWorkerFibo = await NCPU.pick((num)=>{
        const fibo = (value)=>{
            if(value<=2){return 1;}
            return fibo(value-2)+fibo(value-1);
        }
        return fibo(num);
    }, {ncpuWorkerPool}); // reuse a thread
    const res = await Promise.all([multiplexingWorkerFibo(38), NCPU.run((num)=>{
        const fibo = (value)=>{
            if(value<=2){return 1;}
            return fibo(value-2)+fibo(value-1);
        }
        return fibo(num);
    }, [39] ,{ncpuWorkerPool})]); // reuse a thread
    
    // use the default thread pool
    const defaultPool = NCPU.getDefaultWorkerPool();
    await NCPU.run((a, b) => a + b, [5, 10], {ncpuWorkerPool: defaultPool}); // result: 15
}
main()
```
The above example spawns a Worker thread for each callback function when runing. In actual practice, use a pool of Workers instead for these kinds of tasks. Otherwise, the overhead of creating Workers would likely exceed their benefit.

# Advanced Usage

## Using the Default Shared Worker Pool

```js
// 获取默认共享工作池
const defaultPool = NCPU.getDefaultWorkerPool();

// 使用默认工作池执行多个任务
const task1 = NCPU.run(heavyFunction1, [param1, param2], {ncpuWorkerPool: defaultPool});
const task2 = NCPU.run(heavyFunction2, [param3], {ncpuWorkerPool: defaultPool});
const results = await Promise.all([task1, task2]);
```

## Properly Terminating Worker Threads

```js
// 在应用程序退出前终止所有工作线程
process.on('SIGINT', async () => {
  console.log('Terminating worker threads...');
  await NCPU.terminateAll();
  process.exit(0);
});
```

## Setting Timeout for Tasks

```js
// 创建一个有超时设置的工作池
const timeoutPool = NCPU.getWorkerPool({timeout: 5000}); // 5秒超时

try {
  // 如果任务执行超过5秒，将抛出超时错误
  await NCPU.run(longRunningTask, [], {ncpuWorkerPool: timeoutPool});
} catch (err) {
  console.error('Task timed out:', err.message);
}
```

# Other solutions
* [pambdajs](https://github.com/tim-hub/pambdajs)
* [napajs](https://github.com/microsoft/napajs)

# License
[ncpu](https://github.com/zy445566/ncpu) is available under the MIT license. See the [LICENSE](https://github.com/zy445566/ncpu/blob/master/LICENSE) file for details.
