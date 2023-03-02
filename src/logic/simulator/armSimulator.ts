/**
 * armSimulator.ts
 *
 * The ARM simulator. Keeps track of the machine's state and interacts with the
 * UI.
 */

import Messages from "$lib/simMessages";
import UI from "../../presentation/ui";
import AsciiDecoder from "./asciiDecoder";
import Worker from '$lib/simWorker?worker';

export default class ARMSimulator
{
    /*
    The number of bytes in a word. At the time of writing, it's 16 (to implement
    the ARM Thumb instruction set), but this may change later for different ARM
    implementations.
    */
    private static readonly BYTES_IN_WORD = 2;
    // How many general-purpose registers there are
    private static readonly NUM_REGISTERS = 32;
    private static readonly MEMORY_SIZE = (1 << 16) * ARMSimulator.BYTES_IN_WORD;

    // The machine's memory
    private memory: Uint16Array;
    // General-purpose registers
    private registers: Uint16Array;
    // Program counter
    private pc: Uint16Array;

    // Current Program Status Register (CPSR) (more-or-less equivalent to LC-3's PSR)
    private cpsr: Uint16Array;

    // Object file to run
    private userObjectFile: Uint16Array;
    // Memory addresses mapped to the code at each address
    private userDisassembly: Map<number, string>;

    // Worker thread for running the simulator without freezing the app
    private simWorker: Worker;
    // Whether the worker is currently executing code
    private workerBusy: boolean;
    // Shared flag to halt worker
    private workerHalt: Uint8Array;

    public constructor(objectFile: Uint16Array, sourceCode: Map<number, string>)
    {
        this.userObjectFile = objectFile;
        this.userDisassembly = sourceCode;

        this.memory = new Uint16Array(new SharedArrayBuffer(ARMSimulator.MEMORY_SIZE));
        this.registers = new Uint16Array(new SharedArrayBuffer(ARMSimulator.BYTES_IN_WORD * ARMSimulator.NUM_REGISTERS))
        this.pc = new Uint16Array(new SharedArrayBuffer(2));
        this.cpsr = new Uint16Array(new SharedArrayBuffer(2));

        (async () => {
            this.initWorker();
            this.workerBusy = false;

            this.reloadProgram();

            UI.setSimulatorReady();
            UI.appendConsole("Simulator ready.");
        })();
    }

    /**
     * Initializes simWorker
     */
    private initWorker()
    {
        this.simWorker = new Worker();

        this.simWorker.onmessage = (event) => {
            const msg = event.data;
            if (msg.type === Messages.WORKER_DONE) {
                this.workerBusy = false;
                Atomics.store(this.workerHalt, 0, 0);
                UI.setSimulatorReady();
                UI.update();
            }
            else if (msg.type === Messages.CONSOLE)
                UI.appendConsole(msg.message);
        };

        this.simWorker.postMessage({
            type: Messages.INIT,
            memory: this.memory,
            registers: this.registers,
            pc: this.pc,
            psr: this.cpsr,
            halt: this.workerHalt
        });
    }

    public reloadProgram()
    {
        let location = this.userObjectFile[0];
        for (let i = 1; i < this.userObjectFile.length; i++)
        {
            this.setMemory(location++, this.userObjectFile[i]);
        }
        Atomics.store(this.pc, 0, this.userObjectFile[0]);
    }

    /**
     * Return the formatted contents of memory in a given range. Both values in the range
     * will be taken mod x10000.
     * @param start start of range (inclusive)
     * @param end end of range (exclusive)
     * @returns an array of entries with format: [address, hex val, decimal val, code]
     */
    public getMemoryRange(start: number, end: number): string[][]
    {
        let len = end - start;

        start %= 0x1_0000;
        if (start < 0)
            start += 0x1_0000;

        len %= 0x1_0000;
        if (len < 0)
            len += 0x1_0000;

        let res: string[][] = [];

        console.log(this.userDisassembly);

        for (let i = 0; i < len; i++)
        {
            let addr = (i + start) % 0x1_0000;
            let content = this.getMemory(addr);
            let code;
            if (this.userDisassembly.has(addr))
            {
                code = this.userDisassembly.get(addr);
            }
            // todo: OS code
            // else if (this.osDissassembly.has(addr))
            // {
            //     code = this.osDissassembly.get(addr);
            // }
            else
            {
                code = AsciiDecoder.decode(content);
            }

            if (typeof(code) === "undefined")
            {
                code = "";
            }
            res.push([
                "0x" + addr.toString(16),
                "0x" + content.toString(16),
                this.signExtend(content).toString(10),
                code
            ]);
        }
        return res;
    }

    /**
     * Return the number stored in the given memory location
     * @param address the address to query
     * @returns the value stored at memory[address]
     */
    public getMemory(address: number) : number
    {
        return Atomics.load(this.memory, address);
    }

    /**
     * Write the given value to the given memory location
     * @param address the address to write to
     * @param value the value to store at memory[address]
     */
    public setMemory(address: number, value: number)
    {
        Atomics.store(this.memory, address, value);
    }

    /**
     * Return the contents of a register
     * @param registerNumber
     * @returns
     */
    public getRegister(registerNumber: number) : number
    {
        return Atomics.load(this.registers, registerNumber);
    }

    /**
     * Return the value of the program counter
     * @returns
     */
    public getPC(): number
    {
        return Atomics.load(this.pc, 0);
    }

    /**
     * Return the value of the current program status register
     * @returns
     */
    public getPSR() : number
    {
        return Atomics.load(this.cpsr, 0);
    }

    public getPSRInfo(): string[]
    {
        return ["todo", "todo", "todo"];
    }

    /**
     * Sign-extend a 16-bit integer
     */
    public signExtend(num: number): number
    {
        // if it's positive, do not change it
        if ((num & 0x8000) == 0)
        {
            return num;
        }
        else
        {
            // convert to positive 16-bit integer
            num = ~num;
            num += 1;
            num &= 0xFFFF;
            // return its negation
            return -num;
        }
    }
}