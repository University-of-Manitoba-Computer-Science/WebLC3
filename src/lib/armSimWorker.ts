import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    protected static override execute(instruction: number)
    {
        /*
        Different instructions have their opcodes in different places, so we need to switch on the instruction format
        before checking the opcode
        */
        switch ((instruction & 0xe000) >> 13)
        {
            case 0b000:
                // Format 1 (move shifted register) or format 2 (add/subtract)
                break;
            case 0b001:
                // Format 3 (move/compare/add/subtract immediate)
                switch ((instruction & 0x1800) >> 11) {
                    case 0b00:
                        // MOV not implemented since there's no LC-3 equivalent
                        break;
                    case 0b10:
                        this.executeAdd(instruction);
                        break;
                }
                break;
            case 0b110:
                this.executeSwi(instruction);
                break;
        }
    }

    private static executeAdd(instruction: number)
    {
        const registerNumber = (instruction & 0x0700) >> 8;
        const value = instruction & 0x00ff;

        this.setRegister(registerNumber, this.getRegister(registerNumber) + value);
    }

    private static executeSwi(instruction: number)
    {
        const value = instruction & 0x00ff;

        console.log(value);

        if (value == 11)
        {
            // SWI_Exit
            console.log('halting')
            Atomics.store(this.haltFlag, 0, 1);
        }
    }
}

ArmSimWorker.init();