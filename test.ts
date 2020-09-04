import assert from 'assert'
import {NCPU} from './index'

const testUnit = {
    [Symbol('test.run.add')] : async function() {
        assert.equal(
            await NCPU.run((a,b)=>a+b,[1,2]),
            3,
            'test.run.add error'
        )
    },
    [Symbol('test.run.sum')] : async function() {
        assert.equal(
            await NCPU.run((list)=>{
                return list.reduce((total,value)=>{return total+value;});
            },[[1,2,3]]),
            6,
            'test.run.sum error'
        )
    },
    [Symbol('test.run.map')] : async function() {
        assert.deepEqual(
            await NCPU.run((list)=>{
                const map = {}
                for(const value of list) {
                    map[value.id] = value;
                }
                return map;
            },[[{id:1},{id:2}]]),
            {
                1:{id:1},
                2:{id:2}
            },
            'test.run.map error'
        )
    },
    [Symbol('test.pick.fibo')] : async function() {
        const workerFibo = await NCPU.pick((num)=>{
                const fibo = (value)=>{
                    if(value<=2){return 1;}
                    return fibo(value-2)+fibo(value-1);
                }
                return fibo(num);
        });
        assert.equal(
            await workerFibo(38)+await workerFibo(39),
            102334155,
            'test.pick.fibo error'
        )
    },
}


async function run(testUnitList) {
    for(let testUnitValue of testUnitList) {
        for(let testFunc of Object.getOwnPropertySymbols(testUnitValue)) {
            await testUnitValue[testFunc]();
        }
    }
}
(async function() {
    await run([testUnit]);
})();

