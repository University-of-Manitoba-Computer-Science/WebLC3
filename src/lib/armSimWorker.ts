import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    // An extra flag for ARM's fourth status register bit
    private static MASK_C = 0x8;

    protected static override execute(instruction: number)
    {
        console.log(instruction.toString(16))

        /*
        Different instructions have their opcodes in different places, so we need to check the instruction format before
        checking the opcode
        */
        if (this.getBits(instruction, 15, 13) == 0b000)
            this.executeFormat1(instruction);
        else if (this.getBits(instruction, 15, 13) == 0b001)
            this.executeFormat3(instruction);
        else if (this.getBits(instruction, 15, 10) == 0b010000)
            this.executeFormat4(instruction);
        else if (this.getBits(instruction, 15, 10) == 0b010001)
            this.executeFormat5(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1010)
            this.executeAddFormat12(instruction);
        else if (this.getBits(instruction, 15, 8) == 0b10110000)
            this.executeAddFormat13(instruction)
        else if (this.getBits(instruction, 15, 8) == 0b11011111)
            this.executeSwi(instruction); // Format 17
        else if (this.getBits(instruction, 15, 11) == 0b11100)
            this.executeB(instruction); // Format 18
    }

    /**
     * Parses an instruction in format 1 (move shifted register) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat1(instruction: number)
    {
        const opcode = this.getBits(instruction, 12, 11);
        const offset5 = this.getBits(instruction, 10, 6);
        const sourceRegister = this.getBits(instruction, 5, 3);
        const destinationRegister = this.getBits(instruction, 2, 0);

        switch (opcode)
        {
            case 0b10: this.executeAsrFormat1(destinationRegister, sourceRegister, offset5); break;
        }
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat3(instruction: number)
    {
        console.log("format 3");

        this.executeAddFormat3(instruction);
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat4(instruction: number)
    {
        console.log("format 4");

        const sourceDestinationRegister = this.getBits(instruction, 2, 0);
        const sourceRegister2 = this.getBits(instruction, 5, 3);

        const opcode = this.getBits(instruction, 9, 6)
        switch (opcode)
        {
            case 0b0000: this.executeAnd(sourceDestinationRegister, sourceRegister2); break;
            case 0b0100: this.executeAsrFormat4(sourceDestinationRegister, sourceRegister2); break;
            case 0b0101: this.executeAdc(sourceDestinationRegister, sourceRegister2); break;
        }

    }

    /**
     * Parses an instruction in format 5 (hi register operations/branch exchange) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat5(instruction: number)
    {
        console.log("format 5")

        this.executeAddFormat5(instruction);
    }

    // Executes an adc instruction
    private static executeAdc(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("adc")

        let result = this.getRegister(sourceDestinationRegister) + this.getRegister(sourceRegister2);

        const cpsrValue = this.getPSR();
        const carry = cpsrValue & this.MASK_C;
        if (carry)
            result++;

        this.setRegister(sourceDestinationRegister, result);
    }

    // Executes an add instruction in format 3
    private static executeAddFormat3(instruction: number)
    {
        console.log("add format 3")

        const registerNumber = (instruction & 0x0700) >> 8;
        const value = instruction & 0x00ff;

        this.setRegister(registerNumber, this.getRegister(registerNumber) + value);
    }

    // Executes an add instruction in format 5
    private static executeAddFormat5(instruction: number)
    {
        console.log("add format 5 (not supported)")
        return;

        const destinationRegisterNumber = this.getBits(instruction, 2, 0);
        const sourceRegisterNumber = this.getBits(instruction, 5, 3);
        const hiFlag2 = this.getBits(instruction, 6, 6);
        const hiFlag1 = this.getBits(instruction, 7, 7);

        let destinationRegisterValue;
        if (hiFlag1 == 0)
            destinationRegisterValue = this.getRegister(destinationRegisterNumber);
        else
            destinationRegisterValue = this.getHiRegister(destinationRegisterNumber);

        let sourceRegisterValue;
        if (hiFlag2 == 0)
            sourceRegisterValue = this.getRegister(sourceRegisterNumber);
        else
            sourceRegisterValue = this.getHiRegister(sourceRegisterNumber);

        //this.setRegister() Implement a way to view high registers in the simulator before finishing this! As far as
        // storing them goes, turning registers into a 16-element array in an overridden init method is probably the
        // way.
    }

    // Executes an add instruction in format 12
    private static executeAddFormat12(instruction: number)
    {
        console.log("add format 12")

        const sourceBit = this.getBits(instruction, 11, 11);
        const destinationRegister = this.getBits(instruction, 10, 8);
        const word8 = this.getBits(instruction, 7, 0);

        if (sourceBit == 0)
            this.setRegister(destinationRegister, this.getPC() + word8);
        else
            this.setRegister(destinationRegister, this.load(this.savedUSP, 0) + word8);
    }

    // Executes an add instruction in format 13
    private static executeAddFormat13(instruction: number)
    {
        console.log("add format 13")

        const signBit = this.getBits(instruction, 7, 7);
        const sWord7 = this.getBits(instruction, 6, 0);
        const stackPointerValue = this.load(this.savedUSP, 0);

        console.log(signBit);
        console.log(sWord7);
        console.log(stackPointerValue);

        if (signBit == 0)
            this.store(this.savedUSP, 0, stackPointerValue + sWord7);
        else
            this.store(this.savedUSP, 0, stackPointerValue - sWord7);

        console.log(this.load(this.savedUSP, 0));
    }

    // Executes an and instruction
    private static executeAnd(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("and")

        this.setRegister(sourceDestinationRegister, sourceDestinationRegister & sourceRegister2);
    }

    // Executes an asr instruction in format 1
    private static executeAsrFormat1(destinationRegister: number, sourceRegister: number, offset5: number)
    {
        console.log("asr format 1");

        this.setRegister(destinationRegister, sourceRegister >> offset5);
    }

    // Executes an asr instruction in format 4
    private static executeAsrFormat4(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("asr format 4")

        this.setRegister(sourceDestinationRegister, sourceDestinationRegister >> sourceRegister2);
    }

    // Executes a b instruction
    private static executeB(instruction: number)
    {
        console.log("🅱️");

        let offset11 = this.getBits(instruction, 10, 0);

        console.log(this.getBits(offset11, 10, 10))
        console.log(offset11);

        // If the immediate value is negative, get its signed value
        if (this.getBits(offset11, 10, 10) == 1)
        {
            const mask = (1 << 11) - 1;
            offset11 = -((offset11 ^ mask) + 1);
        }

        console.log(offset11);

        this.add(this.pc, 0, offset11);
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
     * Gets the specified range of bits of a 16-bit number
     * @param {number} of
     * @param {number} to
     * @param {number} from
     * @returns {number}
     */
    private static getBits(of: number, to: number, from: number): number
    {
        const high_mask = (1 << (to + 1)) - 1;
        const low_mask = (1 << from) - 1;
        const mask = high_mask ^ low_mask;

        return (of & mask) >> from;
    }
}

ArmSimWorker.init();