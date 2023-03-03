import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    private static override execute(instruction: number)
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
                        this.executeMov(instruction);
                        break;
                }
                break;
            case 0b110:
                this.executeSwi(instruction);
                break;
        }
    }

    private static executeMov(instruction: number)
    {
        console.log("it's movin' time!")
    }

    private static executeSwi(instruction: number)
    {
        console.log("it's swiin' time(?)!")
    }
}

ArmSimWorker.init();