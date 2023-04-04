import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    protected static override execute(instruction: number)
    {
        console.log(instruction.toString(16))

        /*
        Different instructions have their opcodes in different places, so we need to check the instruction format before
        checking the opcode
        */
        if (this.firstNBits(instruction, 3) == 0b001)
            this.executeFormat3(instruction);
        else if (this.firstNBits(instruction, 8) == 0b11011111)
            this.executeSwi(instruction);
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat3(instruction: number)
    {
        console.log("format 3")

        this.executeAdd(instruction)
    }

    // Executes an add instruction
    private static executeAdd(instruction: number)
    {
        console.log("add")

        const registerNumber = (instruction & 0x0700) >> 8;
        const value = instruction & 0x00ff;

        this.setRegister(registerNumber, this.getRegister(registerNumber) + value);
    }

    // Executes an swi instruction
    private static executeSwi(instruction: number)
    {
        console.log("swi")

        const value = instruction & 0x00ff;

        console.log(value);

        if (value == 11)
        {
            // SWI_Exit
            console.log('halting')
            Atomics.store(this.haltFlag, 0, 1);
        }
    }

    /**
     * Gets the first n bits of a 16-bit number
     * @param {number} of
     * @param {number} n
     * @returns {number}
     */
    private static firstNBits(of: number, n: number): number
    {
        const mask = ((1 << n) - 1) << (16 - n);
        return (of & mask) >> (16 - n);
    }
}

ArmSimWorker.init();