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
        if (this.getBits(instruction, 0, 3) == 0b001)
            this.executeFormat3(instruction);
        else if (this.getBits(instruction, 0, 6) == 0b010000)
            this.executeFormat4(instruction);
        else if (this.getBits(instruction, 0, 8) == 0b11011111)
            this.executeSwi(instruction);
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat3(instruction: number)
    {
        console.log("format 3");

        this.executeAdd(instruction);
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat4(instruction: number)
    {
        console.log("format 4");

        this.executeAdc(instruction);
    }

    // Executes an adc instruction
    private static executeAdc(instruction: number)
    {
        console.log("adc")

        // const destinationRegisterNumber =

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
     * Gets the specified bits of a 16-bit number
     * @param {number} of
     * @param {number} from
     * @param {number} to
     * @returns {number}
     */
    private static getBits(of: number, from: number, to: number): number
    {
        const offset = 16 - to + from;
        const mask = ((1 << to) - 1) << offset;
        return (of & mask) >> offset;
    }
}

ArmSimWorker.init();