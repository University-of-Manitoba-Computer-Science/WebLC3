import SimWorker from "./simWorker"

class ArmSimWorker extends SimWorker
{
    public static init()
    {
        console.log("initializing arm worker")
        super.init()
    }
}

ArmSimWorker.init();