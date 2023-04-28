import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    // Extra flag for ARM's additional status register bits
    private static MASK_C = 0x10;
    private static MASK_V = 0x20;

    /**
     * Set the condition codes according to the given number
     * @param result the 16-bit result of an instruction
     */
    protected static override setConditions(result: number)
    {
        super.setConditions(result);

        let psrValue = this.getPSR();

        // (signed) Overflow
        if (result >= 0x7fff)
            psrValue |= this.MASK_V;
        // Carry
        else if (result >= 0xffff)
            psrValue |= this.MASK_C;

        this.setPSR(psrValue);
    }

    /**
     * Checks whether an exception would occur if the given instruction is executed
     * @param instruction The instruction to be executed if an exception doesn't occur
     * @returns
     */
    protected static override checkForException(instruction: number)
    {
        return undefined;
    }

    /**
     * Executes the given instruction
     * @param instruction The instruction to execute
     */
    protected static override execute(instruction: number)
    {
        console.log(this.getPC().toString(16))
        console.log(instruction.toString(16));

        /*
        Different instructions have their opcodes in different places, so we need to check the instruction format before
        checking the opcode
        */
        if (this.getBits(instruction, 15, 13) == 0b000 && this.getBits(instruction, 12, 11) != 0b11)
           this.executeFormat1(instruction);
        else if (this.getBits(instruction, 15, 11) == 0b00011)
           this.executeFormat2(instruction);
        else if (this.getBits(instruction, 15, 13) == 0b001)
            this.executeFormat3(instruction);
        else if (this.getBits(instruction, 15, 10) == 0b010000)
            this.executeFormat4(instruction);
        else if (this.getBits(instruction, 15, 10) == 0b010001)
            this.executeFormat5(instruction);
        else if (this.getBits(instruction, 15, 11) == 0b01001)
            this.executeLdrFormat6(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b0101 && this.getBits(instruction, 9, 9) == 0)
            this.executeFormat7(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b0101 && this.getBits(instruction, 9, 9) == 1)
            this.executeFormat8(instruction);
        else if (this.getBits(instruction, 15, 13) == 0b011)
            this.executeFormat9(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1000)
            this.executeFormat10(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1001)
            this.executeFormat11(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1010)
            this.executeAddFormat12(instruction);
        else if (this.getBits(instruction, 15, 8) == 0b10110000)
            this.executeAddFormat13(instruction)
        else if (this.getBits(instruction, 15, 12) == 0b1011 && this.getBits(instruction, 10, 9) == 0b10)
            this.executeFormat14(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1100)
            this.executeFormat15(instruction);
        else if (this.getBits(instruction, 15, 12) == 0b1101 && this.getBits(instruction, 11, 8) != 0b1111)
            this.executeFormat16(instruction);
        else if (this.getBits(instruction, 15, 8) == 0b11011111)
            this.executeSwi(instruction); // Format 17
        else if (this.getBits(instruction, 15, 11) == 0b11100)
            this.executeB(instruction); // Format 18
        else if (this.getBits(instruction, 15, 12) == 0b1111)
            this.executeBl(instruction); // Format 19
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
            case 0b00: this.executeLslFormat1(destinationRegister, sourceRegister, offset5); break;
            case 0b01: this.executeLsrFormat1(destinationRegister, sourceRegister, offset5); break;
            case 0b10: this.executeAsrFormat1(destinationRegister, sourceRegister, offset5); break;
        }
    }

    /**
     * Parses an instruction in format 3 (add/subtract) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat2(instruction: number)
    {
        const immediateFlag = this.getBits(instruction, 10, 10);
        const opcode = this.getBits(instruction, 9, 9);
        const registerOrImmediate = this.getBits(instruction, 8, 6);
        const sourceRegister = this.getBits(instruction, 5, 3);
        const destinationRegister = this.getBits(instruction, 2, 0);

        if (opcode == 0 && immediateFlag == 0)
            this.executeAddFormat2(destinationRegister, sourceRegister, registerOrImmediate);
        else if (opcode == 0 && immediateFlag == 1)
            this.executeAddFormat2Immediate(destinationRegister, sourceRegister, registerOrImmediate);
        else if (opcode == 1 && immediateFlag == 0)
            this.executeSubFormat2(destinationRegister, sourceRegister, registerOrImmediate);
        else if (opcode == 1 && immediateFlag == 1)
            this.executeSubFormat2Immediate(destinationRegister, sourceRegister, registerOrImmediate);
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat3(instruction: number)
    {
        const opcode = this.getBits(instruction, 12, 11);
        const destinationRegister = this.getBits(instruction, 10, 8);
        const offset8 = this.getBits(instruction, 7, 0);

        switch (opcode)
        {
            case 0b00: this.executeMovFormat3(destinationRegister, offset8); break;
            case 0b01: this.executeCmpFormat3(destinationRegister, offset8); break;
            case 0b10: this.executeAddFormat3(destinationRegister, offset8); break;
            case 0b11: this.executeSubFormat3(destinationRegister, offset8); break;
        }
    }

    /**
     * Parses an instruction in format 3 (move/compare/add/subtract immediate) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat4(instruction: number)
    {
        const sourceDestinationRegister = this.getBits(instruction, 2, 0);
        const sourceRegister2 = this.getBits(instruction, 5, 3);

        const opcode = this.getBits(instruction, 9, 6)
        switch (opcode)
        {
            case 0b0000: this.executeAnd(sourceDestinationRegister, sourceRegister2); break;
            case 0b0001: this.executeEor(sourceDestinationRegister, sourceRegister2); break;
            case 0b0010: this.executeLslFormat4(sourceDestinationRegister, sourceRegister2); break;
            case 0b0011: this.executeLsrFormat4(sourceDestinationRegister, sourceRegister2); break;
            case 0b0100: this.executeAsrFormat4(sourceDestinationRegister, sourceRegister2); break;
            case 0b0110: this.executeSbc(sourceDestinationRegister, sourceRegister2); break;
            case 0b0111: this.executeRor(sourceDestinationRegister, sourceRegister2); break;
            case 0b1000: this.executeTst(sourceDestinationRegister, sourceRegister2); break;
            case 0b1001: this.executeNeg(sourceDestinationRegister, sourceRegister2); break;
            case 0b0101: this.executeAdc(sourceDestinationRegister, sourceRegister2); break;
            case 0b1010: this.executeCmpFormat4(sourceDestinationRegister, sourceRegister2); break;
            case 0b1011: this.executeCmn(sourceDestinationRegister, sourceRegister2); break;
            case 0b1100: this.executeOrr(sourceDestinationRegister, sourceRegister2); break;
            case 0b1101: this.executeMul(sourceDestinationRegister, sourceRegister2); break;
            case 0b1110: this.executeBic(sourceDestinationRegister, sourceRegister2); break;
            case 0b1111: this.executeMvn(sourceDestinationRegister, sourceRegister2); break;
        }
    }

    /**
     * Parses an instruction in format 5 (hi register operations/branch exchange) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat5(instruction: number)
    {
        // Check for rti (see the parseRti method in armParser.ts for info on why this exists)
        if (instruction == 0b0100011101000000)
        {
            console.log("format 5 (rti workaround)")
            this.execRti(instruction);
            return;
        }
        // Other than the custom rti, only support bx with lo registers
        else if (this.getBits(instruction, 15, 6) == 0b0100011100)
        {
            const sourceRegister = this.getBits(instruction, 5, 3);
            this.executeBxLo(sourceRegister);
            return;
        }

        console.log("format 5 (not supported - no high registers)")
        return;
        /*
        Implement a way to view high registers in the simulator before finishing this! As far as storing them goes,
        turning registers into a 16-element array in an overridden init method is probably the way.
        Update: These are officially not supported since they require simulated hardware not found in the LC-3.
        */

        const opcode = this.getBits(instruction, 9, 8);
        switch (opcode)
        {
            case 0b00: this.executeAddFormat5(instruction); break;
            //case 0b11: this.executeBx(
        }

    }

    /**
     * Parses an instruction in format 7 (load/store with register offset) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat7(instruction: number)
    {
        const loadStoreFlag = this.getBits(instruction, 11, 11);
        const byteWordFlag = this.getBits(instruction, 10, 10);
        const offsetRegister = this.getBits(instruction, 8, 6);
        const baseRegister = this.getBits(instruction, 5, 3);
        const sourceDestinationRegister = this.getBits(instruction, 2, 0);

        if (loadStoreFlag == 0 && byteWordFlag == 0)
            this.executeStrFormat7(sourceDestinationRegister, baseRegister, offsetRegister);
        else if (loadStoreFlag == 0 && byteWordFlag == 1)
            this.executeStrbFormat7(sourceDestinationRegister, baseRegister, offsetRegister);
        else if (loadStoreFlag == 1 && byteWordFlag == 0)
            this.executeLdrFormat7(sourceDestinationRegister, baseRegister, offsetRegister);
        else if (loadStoreFlag == 1 && byteWordFlag == 1)
            this.executeLdrbFormat7(sourceDestinationRegister, baseRegister, offsetRegister);
    }

    /**
     * Parses an instruction in format 8 (load/store sign-extended byte/halfword) and calls the appropriate execute
     * function
     * @param {number} instruction
     */
    private static executeFormat8(instruction: number)
    {
        const hFlag = this.getBits(instruction, 11, 11);
        const signExtendFlag = this.getBits(instruction, 10, 10);
        const offsetRegister = this.getBits(instruction, 8, 6);
        const baseRegister = this.getBits(instruction, 5, 3);
        const destinationRegister = this.getBits(instruction, 2, 0);

        if (signExtendFlag == 0 && hFlag == 0)
            this.executeStrhFormat8(destinationRegister, baseRegister, offsetRegister);
        else if (signExtendFlag == 0 && hFlag == 1)
            this.executeLdrhFormat8(destinationRegister, baseRegister, offsetRegister);
        else if (signExtendFlag == 1 && hFlag == 0)
            this.executeLdsb(destinationRegister, baseRegister, offsetRegister);
        else if (signExtendFlag == 1 && hFlag == 1)
            this.executeLdsh(destinationRegister, baseRegister, offsetRegister);
    }

    /**
     * Parses an instruction in format 9 (load/store with immediate offset) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat9(instruction: number)
    {
        const loadStoreFlag = this.getBits(instruction, 11, 11);
        const byteWordFlag = this.getBits(instruction, 12, 12);
        const offset5 = this.getBits(instruction, 10, 6, true);
        const baseRegister = this.getBits(instruction, 5, 3);
        const sourceDestinationRegister = this.getBits(instruction, 2, 0);

        if (loadStoreFlag == 0 && byteWordFlag == 0)
            this.executeStrFormat9(sourceDestinationRegister, baseRegister, offset5);
        else if (loadStoreFlag == 0 && byteWordFlag == 1)
            this.executeStrbFormat9(sourceDestinationRegister, baseRegister, offset5);
        else if (loadStoreFlag == 1 && byteWordFlag == 0)
            this.executeLdrFormat9(sourceDestinationRegister, baseRegister, offset5);
        else if (loadStoreFlag == 1 && byteWordFlag == 1)
            this.executeLdrbFormat9(sourceDestinationRegister, baseRegister, offset5);
    }

    /**
     * Parses an instruction in format 10 (load/store halfword) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat10(instruction: number)
    {
        const loadStoreFlag = this.getBits(instruction, 11, 11);
        const offset5 = this.getBits(instruction, 10, 6, true);
        const baseRegister = this.getBits(instruction, 5, 3);
        const sourceDestinationRegister = this.getBits(instruction, 2, 0);

        if (loadStoreFlag == 0)
            this.executeStrhFormat10(sourceDestinationRegister, baseRegister, offset5);
        else
            this.executeLdrhFormat10(sourceDestinationRegister, baseRegister, offset5);
    }

    /**
     * Parses an instruction in format 11 (SP-relative load/store) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat11(instruction: number)
    {
        const loadStoreBit = this.getBits(instruction, 11, 11);
        const destinationRegister = this.getBits(instruction, 10, 8);
        const word8 = this.getBits(instruction, 7, 0);

        if (loadStoreBit == 0)
            this.executeStrFormat11(destinationRegister, word8);
        else
            this.executeLdrFormat11(destinationRegister, word8);
    }

    /**
     * Parses an instruction in format 14 (push/pop registers) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat14(instruction: number)
    {
        const loadStoreBit = this.getBits(instruction, 11, 11);
        const pcLrBit = this.getBits(instruction, 8, 8);
        const registerBits = this.getBits(instruction, 7, 0);
        const registerList = [];
        for (let i = 0; i < 8; i++)
        {
            if (((1 << i) & registerBits) > 0)
                registerList.push(i);
        }

        if (loadStoreBit == 0 && pcLrBit == 0)
            this.executePush(registerList);
        else if (loadStoreBit == 0 && pcLrBit == 1)
            this.executePushLr(registerList);
        else if (loadStoreBit == 1 && pcLrBit == 0)
            this.executePop(registerList);
        else if (loadStoreBit == 1 && pcLrBit == 1)
            this.executePopPc(registerList);
    }

    /**
     * Parses a an instruction in format 15 (multiple load/store) and calls the appropriate execute function
     * @param {number} instruction
     */
    private static executeFormat15(instruction: number)
    {
        const loadStoreBit = this.getBits(instruction, 11, 11);
        const baseRegister = this.getBits(instruction, 10, 8);
        const registerBits = this.getBits(instruction, 7, 0);

        const registerList = [];
        for (let i = 0; i < 7; i++)
        {
            if (((1 << i) & registerBits) > 0)
                registerList.push(i);
        }

        if (loadStoreBit == 0)
            this.executeStmia(baseRegister, registerList);
        else
            this.executeLdmia(baseRegister, registerList);
    }

    /**
     * Parses and executes an instruction in format 16 (conditional branch)
     * @param instruction
     */
    private static executeFormat16(instruction: number)
    {
        const condition = this.getBits(instruction, 11, 8);
        let sOffset8 = this.getBits(instruction, 7, 0);

        // If the immediate value is negative, get its signed value
        if (this.getBits(sOffset8, 7, 7) == 1)
        {
            const mask = (1 << 8) - 1;
            sOffset8 = -((sOffset8 ^ mask) + 1);
        }

        let branch = false;
        switch (condition)
        {
            // beq
            case 0b0000:
                console.log("beq");
                branch = this.flagZero(); break;
            // bne
            case 0b0001:
                console.log("bne");
                branch = !this.flagZero(); break;
            // bcs
            case 0b0010:
                console.log("bcs");
                branch = !!(this.getPSR() & this.MASK_C); break;
            // bcc
            case 0b0011:
                console.log("bcc");
                branch = !(this.getPSR() & this.MASK_C); break;
            // bmi
            case 0b0100:
                console.log("bmi");
                branch = this.flagNegative(); break;
            // bpl
            case 0b0101:
                console.log("bpl");
                branch = !this.flagNegative(); break;
            // bvs
            case 0b0110:
                console.log("bvs");
                branch = !!(this.getPSR() & this.MASK_V); break;
            // bvc
            case 0b0111:
                console.log("bvc");
                branch = !(this.getPSR() & this.MASK_V); break;
            // bhi
            case 0b1000:
                console.log("bhi");
                branch = !!(this.getPSR() & this.MASK_C) && !this.flagZero(); break;
            // bls
            case 0b1001:
                console.log("bls");
                branch = !(this.getPSR() & this.MASK_C) || !this.flagZero(); break;
            // bge
            case 0b1010:
                console.log("bge");
                branch =
                    (this.flagNegative() && !!(this.getPSR() & this.MASK_V))
                    || !(this.flagNegative() && !(this.getPSR() & this.MASK_V));
                break;
            // blt
            case 0b1011:
                console.log("blt");
                branch =
                    (this.flagNegative() && !(this.getPSR() & this.MASK_V))
                    || !(this.flagNegative() && !!(this.getPSR() & this.MASK_V));
                break;
            // bgt
            case 0b1100:
                console.log("bgt");
                branch =
                    this.flagZero() && (
                        (this.flagNegative() && !!(this.getPSR() & this.MASK_V))
                        || (!this.flagNegative() && !(this.getPSR() & this.MASK_V))
                    );
                break;
            // ble
            case 0b1101:
                console.log("ble");
                branch =
                    this.flagZero() || (
                        (this.flagNegative()) && !(this.getPSR() & this.MASK_V)
                        || (!this.flagNegative()) && !!(this.getPSR() & this.MASK_V)
                    );
                break;
        }

        if (branch)
            this.add(this.pc, 0, sOffset8);
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
        this.setConditions(result);
    }

    // Executes an add instruction in format 2
    private static executeAddFormat2(destinationRegister: number, sourceRegister: number, registerOrImmediate: number)
    {
        console.log("add format 2")

        const result = this.getRegister(registerOrImmediate) + this.getRegister(sourceRegister);
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an add instruction in format 2, but the last operand is immediate (I want to throw a table at whoever designed this format)
    private static executeAddFormat2Immediate(destinationRegister: number, sourceRegister: number, registerOrImmediate: number)
    {
        console.log("add format 2 (immediate)")

        const result = registerOrImmediate + this.getRegister(sourceRegister);
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an add instruction in format 3
    private static executeAddFormat3(destinationRegister: number, offset8: number)
    {
        console.log("add format 3")

        const result = this.getRegister(destinationRegister) + offset8;
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an add instruction in format 5
    private static executeAddFormat5(instruction: number)
    {
        console.log("add format 5")

        const destinationRegisterNumber = this.getBits(instruction, 2, 0);
        const sourceRegisterNumber = this.getBits(instruction, 5, 3);
        const hiFlag2 = this.getBits(instruction, 6, 6);
        const hiFlag1 = this.getBits(instruction, 7, 7);

        let destinationRegisterValue;
        if (hiFlag1 == 0)
            destinationRegisterValue = this.getRegister(destinationRegisterNumber);
        // else
        //     destinationRegisterValue = this.getHiRegister(destinationRegisterNumber);

        let sourceRegisterValue;
        if (hiFlag2 == 0)
            sourceRegisterValue = this.getRegister(sourceRegisterNumber);
        // else
        //     sourceRegisterValue = this.getHiRegister(sourceRegisterNumber);

        //this.setRegister(
    }

    // Executes an add instruction in format 12
    private static executeAddFormat12(instruction: number)
    {
        console.log("add format 12")

        /*
        Note that I replaced the source bit with an extra bit for the immediate
        field in order to maintain compatibility with programs that use LC-3's
        LEA instruction (which uses a 9-bit immediate field)
        */
        //const sourceBit = this.getBits(instruction, 11, 11);
        const destinationRegister = this.getBits(instruction, 11, 9);
        const word8 = this.getBits(instruction, 8, 0, true);

        // if (sourceBit == 0)
            this.setRegister(destinationRegister, this.getPC() + word8);
        // else
        //     this.setRegister(destinationRegister, this.load(this.savedUSP, 0) + word8);
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

        const result = this.getRegister(sourceDestinationRegister) & this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an asr instruction in format 1
    private static executeAsrFormat1(destinationRegister: number, sourceRegister: number, offset5: number)
    {
        console.log("asr format 1");

        const result = this.getRegister(sourceRegister) >> offset5;
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an asr instruction in format 4
    private static executeAsrFormat4(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("asr format 4")

        const result = this.getRegister(sourceDestinationRegister) >> this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes a b instruction
    private static executeB(instruction: number)
    {
        console.log("🅱️");

        let offset11 = this.getBits(instruction, 10, 0);

        // If the immediate value is negative, get its signed value
        if (this.getBits(offset11, 10, 10) == 1)
        {
            const mask = (1 << 11) - 1;
            offset11 = -((offset11 ^ mask) + 1);
        }

        console.log(offset11);

        this.add(this.pc, 0, offset11);
    }

    // Executes a bic instruction
    private static executeBic(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("bic");

        const result = this.getRegister(sourceDestinationRegister) & ~this.getRegister(sourceRegister2)
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes a bl instruction
    private static executeBl(instruction: number)
    {
        /*
        This implementation ignores the two-instruction gimmick that BL uses. For more information, see the comments on
        the armParser.asmFormat19 method.
        */
        console.log("bl")

        // const offsetBit = this.getBits(instruction, 11, 11);
        let offset = this.getBits(instruction, 10, 0, true);


        console.log(offset.toString(16));


        // if (offsetBit == 0)
        //     offset = offset << 12;
        // else
        //     offset = offset << 1;

        // Imitate JSR by saving the current (incremented) PC to r7
        this.setRegister(7, this.getPC());

        this.add(this.pc, 0, offset);
    }

    // Executes a bx instruction with lo registers
    private static executeBxLo(sourceRegister: number)
    {
        console.log("bx")

        /*
        Don't do any ARM state change shenanigans; just do an unconditional branch to the address contained in the
        source register
        */

        const offset = this.getRegister(sourceRegister) - this.getPC();
        this.add(this.pc, 0, offset);
    }

    // Executes a cmn instruction
    private static executeCmn(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("cmn");

        const result = this.getRegister(sourceDestinationRegister) + this.getRegister(sourceRegister2);
        this.setConditions(result);
    }

    // Executes a cmp instruction in format 3
    private static executeCmpFormat3(destinationRegister: number, offset8: number)
    {
        console.log("cmp format 3");

        const result = this.getRegister(destinationRegister) - offset8;
        this.setConditions(result);
    }

    // Executes a cmp instruction in format 4
    private static executeCmpFormat4(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("cmp format 4");

        const result = this.getRegister(sourceDestinationRegister) - this.getRegister(sourceRegister2);
        this.setConditions(result);
    }

    // Executes an eor instruction
    private static executeEor(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("eor");

        const result = this.getRegister(sourceDestinationRegister) ^ this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an ldmia instruction
    private static executeLdmia(baseRegister: number, registerList: Array<number>)
    {
        console.log("ldmia")

        const startLocation = this.getRegister(baseRegister);

        for (let i = 0; i < registerList.length; i++)
        {
            const register = registerList[i];
            this.setRegister(register, this.getMemory(startLocation + i));
        }
        this.setRegister(baseRegister, registerList.length - 1);
    }

    // Executes an ldr instruction in format 6
    private static executeLdrFormat6(instruction: number)
    {
        console.log("ldr format 6");

        const destinationRegister = this.getBits(instruction, 10, 8);
        const word8 = this.getBits(instruction, 7, 0);
        this.setRegister(destinationRegister, this.getMemory(this.getPC() + word8));
    }

    // Executes an ldr instruction in format 7
    private static executeLdrFormat7(sourceDestinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("ldr format 7")

        const sourceAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        const result = this.getMemory(sourceAddress);
        this.setRegister(sourceDestinationRegister, result);
    }

    // Executes an ldr instruction in format 9
    private static executeLdrFormat9(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("ldr format 9")

        const sourceAddress = this.getRegister(baseRegister) + offset5;

        const result = this.getMemory(sourceAddress);
        this.setRegister(sourceDestinationRegister, result);
    }

    // Executes an ldr instruction in format 11
    private static executeLdrFormat11(destinationRegister: number, word8: number)
    {
        console.log("ldr format 11")

        const startLocation = this.getRegister(7);
        const result = this.getMemory(startLocation + word8);
        this.setRegister(destinationRegister, result);
    }

    // Executes an ldrb instruction in format 7
    private static executeLdrbFormat7(sourceDestinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("ldrb format 7")

        const sourceAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        const result = this.getMemory(sourceAddress);
        this.setRegister(sourceDestinationRegister, result & 0x00ff);
    }

    // Executes an ldrb isntruction in format 9
    private static executeLdrbFormat9(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("ldrb format 9")

        const sourceAddress = this.getRegister(baseRegister) + offset5;
        const result = this.getMemory(sourceAddress);
        this.setRegister(sourceDestinationRegister, result & 0x00ff);
    }

    // Executes an ldrh instruction in format 8
    private static executeLdrhFormat8(destinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("ldrh format 8")

        const sourceAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        const result = this.getMemory(sourceAddress);
        this.setRegister(destinationRegister, result);
    }

    // Executes an ldrh instruction in format 10
    private static executeLdrhFormat10(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("ldrh format 10")

        const sourceAddress = this.getRegister(baseRegister) + offset5;
        const result = this.getMemory(sourceAddress);
        this.setRegister(sourceDestinationRegister, result);
    }

    // Executes an lsl instruction in format 1
    private static executeLslFormat1(destinationRegister: number, sourceRegister: number, offset5: number)
    {
        console.log("lsl format 1")

        let result = this.getRegister(sourceRegister) << offset5;
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an lsl instruction in format 4
    private static executeLslFormat4(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("lsl format 4")

        const result = sourceDestinationRegister << sourceRegister2;
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an ldsb instruction
    private static executeLdsb(destinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("ldsb")

        const sourceAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        let result = this.getMemory(sourceAddress) & 0xff;
        // Sign-extend the 8-bit value
        if (this.getBits(result, 7, 7) == 1)
            result |= 0xff00;
        this.setRegister(destinationRegister, result);
    }

    // Executes an ldsh instruction
    private static executeLdsh(destinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("ldsh")

        const sourceAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        let result = this.getMemory(sourceAddress);
        this.setRegister(destinationRegister, result);
    }

    // Executes an lsr instruction in format 1
    private static executeLsrFormat1(destinationRegister: number, sourceRegister: number, offset5: number)
    {
        console.log("lsr format 1")

        let result = this.getRegister(sourceRegister) >> offset5;
        // Turn the arithmetic right shift into a logical one
        result = this.getBits(result, 16 - offset5, 0);
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an lsr instruction in format 4
    private static executeLsrFormat4(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("lsr format 4")

        let result = this.getRegister(sourceDestinationRegister) >> this.getRegister(sourceRegister2);
        // Turn the arithmetic right shift into a logical one
        result = this.getBits(result, 16 - sourceRegister2, 0);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes a mov instruction in format 3
    private static executeMovFormat3(destinationRegister: number, offset8: number)
    {
        console.log("mov format 3")

        this.setRegister(destinationRegister, offset8);
        this.setConditions(offset8);
    }

    // Executes a mul instruction
    private static executeMul(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("mul")

        const result = this.getRegister(sourceRegister2) * this.getRegister(sourceDestinationRegister);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an mvn instruction
    private static executeMvn(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("mvn")

        const result = ~this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes a neg instruction
    private static executeNeg(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("neg")

        const result = -this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an orr instruction
    private static executeOrr(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("orr")

        const result = this.getRegister(sourceDestinationRegister) | this.getRegister(sourceRegister2);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes a pop instruction
    private static executePop(registerList: Array<number>)
    {
        console.log("pop")

        for (let i = registerList.length - 1; i >= 0; i--)
        {
            this.setRegister(registerList[i], this.getMemory(this.getRegister(6)));
            this.setRegister(6, this.getRegister(6) + 1);
        }
    }

    // Executes a pop instruction involving the program counter
    private static executePopPc(registerList: Array<number>)
    {
        console.log(
            "pop with pc (not supported - relies on calling convention details that aren't implemented yet)")
    }

    // Executes a push instruction
    private static executePush(registerList: Array<number>)
    {
        console.log("push")

        for (let i = 0; i < registerList.length; i++)
        {
            this.setRegister(6, this.getRegister(6) - 1);
            this.setMemory(this.getRegister(6), this.getRegister(registerList[i]));
        }
    }

    // Executes a pop instruction involving the link register
    private static executePushLr(registerList: Array<number>)
    {
        console.log(
            "push with lr (not supported - relies on calling convention details that aren't implemented yet)")
    }

    // Executes a ror instruction
    private static executeRor(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("ror")

        const rs = this.getRegister(sourceRegister2);
        const endBits = this.getBits(this.getRegister(sourceDestinationRegister), rs - 1, 0);
        let result = this.getRegister(sourceDestinationRegister) >> rs;
        // Reintroduce the bits we cut off
        result |= (endBits << 16 - rs);
        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an sbc instruction
    private static executeSbc(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("sbc")

        const cpsrValue = this.getPSR();
        const carry = !!(cpsrValue & this.MASK_C);
        const result = this.getRegister(sourceDestinationRegister) - this.getRegister(sourceRegister2) - ~carry;

        this.setRegister(sourceDestinationRegister, result);
        this.setConditions(result);
    }

    // Executes an stmia instruction
    private static executeStmia(baseRegister: number, registerList: Array<number>)
    {
        console.log("stmia")

        const startLocation = this.getRegister(baseRegister);

        for (let i = 0; i < registerList.length; i++)
        {
            const register = registerList[i];
            this.setMemory(startLocation + i, this.getRegister(register));
        }
        this.setRegister(baseRegister, registerList.length - 1);
    }

    // Executes an str instruction in format 7
    private static executeStrFormat7(sourceDestinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("str format 7")

        const targetAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        const result = this.getRegister(sourceDestinationRegister);
        this.setMemory(targetAddress, result);
    }

    // Executes an str instruction in format 9
    private static executeStrFormat9(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("str format 9")

        const targetAddress = this.getRegister(baseRegister) + offset5;
        const result = this.getRegister(sourceDestinationRegister);
        this.setMemory(targetAddress, result);
    }

    // Executes an str instruction in format 11
    private static executeStrFormat11(destinationRegister: number, word8: number)
    {
        console.log("sdr format 11")

        const startLocation = this.getRegister(7);
        const targetAddress = this.getMemory(startLocation + word8);
        this.setMemory(targetAddress, this.getRegister(destinationRegister));
    }

    // Executes an strb instruction in format 7
    private static executeStrbFormat7(sourceDestinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("strb format 7")

        const targetAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        this.setMemory(targetAddress, sourceDestinationRegister & 0xff);
    }

    // Executes an strb instruction in format 9
    private static executeStrbFormat9(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("strb format 9")

        const targetAddress = this.getRegister(baseRegister) + offset5;
        this.setMemory(targetAddress, sourceDestinationRegister & 0xff);
    }

    // Executes an strh instruction in format 8
    private static executeStrhFormat8(destinationRegister: number, baseRegister: number, offsetRegister: number)
    {
        console.log("strh format 8")

        const targetAddress = this.getRegister(baseRegister) + this.getRegister(offsetRegister);
        this.setMemory(targetAddress, this.getRegister(destinationRegister));
    }

    // Executes an strh instruction in format 10
    private static executeStrhFormat10(sourceDestinationRegister: number, baseRegister: number, offset5: number)
    {
        console.log("strh format 10")

        const targetAddress = this.getRegister(baseRegister) + offset5;
        this.setMemory(targetAddress, this.getRegister(sourceDestinationRegister));
    }

    // Executes a sub instruction in format 2
    private static executeSubFormat2(destinationRegister: number, sourceRegister: number, registerOrImmediate: number)
    {
        console.log("sub format 2")

        const result = this.getRegister(sourceRegister) - this.getRegister(registerOrImmediate);
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes a sub instruction in format 2, but the last operand is immediate (:/)
    private static executeSubFormat2Immediate(destinationRegister: number, sourceRegister: number, registerOrImmediate: number)
    {
        console.log("sub format 2 (immediate)")

        const result = this.getRegister(sourceRegister) - registerOrImmediate;
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes a sub instruction in format 3
    private static executeSubFormat3(destinationRegister: number, offset8: number)
    {
        console.log("sub format 3")

        const result = this.getRegister(destinationRegister) - offset8;
        this.setRegister(destinationRegister, result);
        this.setConditions(result);
    }

    // Executes an swi instruction
    private static executeSwi(instruction: number)
    {
        console.log("swi")

        const vector = instruction & 0x00ff;

        this.initTrap(vector);
    }

    // Executes a tst instruction
    private static executeTst(sourceDestinationRegister: number, sourceRegister2: number)
    {
        console.log("tst")

        this.setConditions(this.getRegister(sourceDestinationRegister) & this.getRegister(sourceRegister2));
    }

    /**
     * Gets the specified range of bits of a 16-bit number
     * @param {number} of
     * @param {number} to
     * @param {number} from
     * @returns {number}
     */
    private static getBits(of: number, to: number, from: number, signed: boolean = false): number
    {
        const high_mask = (1 << (to + 1)) - 1;
        const low_mask = (1 << from) - 1;
        const mask = high_mask ^ low_mask;

        let result = (of & mask) >> from;
        if (signed)
            result = this.signExtend(result, to - from + 1);

        return result
    }

    /**
     * Sign-extends the given number to 16 bits
     * @param {number} toExtend
     * @param {number} originalBitLength
     */
    private static signExtend(toExtend: number, originalBitLength: number): number
    {
        let result = toExtend;
        // e.g. if originalBitLength = 8, signBit = 0b1000_0000
        const signBit = 1 << (originalBitLength - 1);
        // e.g. if originalBitLength = 8, signExtension = 0b1111_1111_1000_0000
        const signExtension = ((2 ** 16) - 1) ^ (signBit - 1);
        if ((result & signBit) != 0)
            result |= signExtension;

        return result;
    }
}

ArmSimWorker.init();