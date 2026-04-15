/**
 * 微任务/宏任务 例题可执行文件
 * 运行: node event-loop-examples.js
 * 每道题之间用 100ms 间隔，避免不同题的 setTimeout 互相交错
 */

function runExample(name, fn) {
    return new Promise((resolve) => {
        console.log('\n' + '='.repeat(50))
        console.log(name)
        console.log('='.repeat(50))
        fn()
            // 留时间让本轮及后续宏任务执行完
        setTimeout(resolve, 100)
    })
}

async function main() {
    // ---------- 例题 1：你给的题 ----------
    await runExample('例题1：同步 + Promise.then + setTimeout', () => {
            console.log('输出1')
            setTimeout(() => {
                console.log('输出2')
            })
            console.log('输出3')
            const promise1 = new Promise((resolve) => {
                console.log('输出4')
                resolve(1)
            })
            promise1.then(() => {
                console.log('输出5')
                setTimeout(() => {
                    console.log('输出6')
                })
            })
        })
        // 1 3 4  5 2 6 

    // ---------- 例题 2 ----------
    await runExample('例题2：微任务 vs 宏任务（基础）', () => {
        console.log('1')
        setTimeout(() => console.log('2'), 0)
        Promise.resolve().then(() => console.log('3'))
        console.log('4')
    })

    // 1 4 3 2
    // ---------- 例题 3 ----------
    await runExample('例题3：多层 then + setTimeout', () => {
            console.log('A')
            setTimeout(() => console.log('B'), 0)
            Promise.resolve()
                .then(() => {
                    console.log('C')
                    setTimeout(() => console.log('D'), 0)
                })
                .then(() => console.log('E'))
            console.log('F')
        })
        // A F C E B D

    // ---------- 例题 4 ----------
    await runExample('例题4：async/await（await 后为微任务）', () => {
            async function fn() {
                console.log('A')
                await console.log('B')
                console.log('C')
            }
            console.log('D')
            fn()
            console.log('E')
        })
        // D A B E C

    // ---------- 例题 5 ----------
    await runExample('例题5：async + Promise 混排', () => {
            console.log('1')
            async function async1() {
                console.log('2')
                await async2()
                console.log('3')
            }
            async function async2() {
                console.log('4')
            }
            async1()
            new Promise((resolve) => {
                console.log('5')
                resolve()
            }).then(() => {
                console.log('6')
            })
            console.log('7')
        })
        //1 2 4 5 7 3 6


    // ---------- 例题 6 ----------
    await runExample('例题6：queueMicrotask + Promise.then', () => {
        console.log('a')
        setTimeout(() => console.log('b'), 0)
        queueMicrotask(() => console.log('c'))
        Promise.resolve().then(() => console.log('d'))
        console.log('e')
    })

    // a e c d b
    // ---------- 例题 7 ----------
    await runExample('例题7：then 里 return Promise（多一次微任务）', () => {
        console.log('start')
        Promise.resolve()
            .then(() => {
                console.log('p1')
                return Promise.resolve('p2')
            })
            .then((r) => console.log(r))
        Promise.resolve().then(() => console.log('p3'))
        console.log('end')
    })

    //start end p1 p3 p2

    // ---------- 例题 8 ----------
    await runExample('例题8：综合（宏任务内再产生微任务）', () => {
        console.log('0')
        setTimeout(() => {
            console.log('1')
            Promise.resolve().then(() => console.log('2'))
        }, 0)
        setTimeout(() => console.log('3'), 0)
        Promise.resolve().then(() => {
            console.log('4')
            setTimeout(() => console.log('5'), 0)
        })
        console.log('6')
    })

    // 0 6 4 1 2 3 5

    console.log('\n' + '='.repeat(50))
    console.log('全部例题跑完，请对照 event-loop-examples.md 中的预期顺序')
    console.log('='.repeat(50))
}

main()