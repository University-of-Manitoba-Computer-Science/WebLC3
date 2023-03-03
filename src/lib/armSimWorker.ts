import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    private static override execute(instruction: number)
    {
        console.log("now it's really instructin' time")
    }
}

ArmSimWorker.init();