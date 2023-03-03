import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    private static override execute(instruction: number)
    {
        /*
        Different instructions have their opcodes in different places, so we need to switch on the instruction format
        before checking the opcode
        */
        switch (this.mostSignificantBits(instruction, 3))
        {
            case 0b000:
                // Format 1 (move shifted register) or format 2 (add/subtract)
                break;
            case 0b001:
                // Format 3 (move/compare/add/subtract immediate)
                switch ((instruction & 0x1800) >> 11) // wait no
                    case 0b00:
                        this.executeMov(instruction);
                        break;
                }
                break;
            case 0b110:
                if ((instruction & 0x1f00) >> )
        }
    }

    /**
     * Gets the most significant bits of a given number
     * @param num The number to get bits of
     * @param num_bits_to_get How many bits to get
     * @param num_length How long the num parameter is, measured in bits
     * @returns The first num_bits_to_get bits of num
     */
    private static mostSignificantBits(num: number, num_bits_to_get: number, num_length: number = 16) : number
    {
        const offset = num_length - num_bits_to_get;
        const mask: number = num_bits_to_get << offset
        return (num & mask) >> offset;
    }

    private static executeMov(instruction: number)
    {
        console.log("it's movin' time!")
    }
}

ArmSimWorker.init();