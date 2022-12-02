const main = async () => {
    const [owner, randomPerson] = await hre.ethers.getSigners();
    const domainContractFactory = await hre.ethers.getContractFactory("Domains");
    const domainContract = await domainContractFactory.deploy("necks");
    await domainContract.deployed();

    console.log("Contract deployed to:", domainContract.address);
    console.log("Contract owner:", owner.address);

    let txn = await domainContract.register("turtle", {value: hre.ethers.utils.parseEther("0.0001")});
    await txn.wait();

    const address = await domainContract.getAddress("turtle");
    console.log("Owner of domain mortal:", address);

    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance:", hre.ethers.utils.formatEther(balance));

    //Grab the funds from the contract
    try{
        txn = await domainContract.connect(supperCoder).withdraw();
        await txn.wait();
    }catch(error){
        console.log("Could not rob contract");
    }

    //Lets look into their wallet and compare later
    let ownerBalance = await hre.ethers.provider.getBalance(owner.address);
    console.log("Balance of owner before withdraw:", hre.ethers.utils.formatEther(ownerBalance));

    //Looks like the owner is saving their money
    txn = await domainContract.connect(owner).withdraw();
    await txn.wait();

    //Fetch balance of contract & owner
    const contractBalance = await hre.ethers.provider.getBalance(domainContract.address);
    ownerBalance = await hre.ethers.provider.getBalance(owner.address);

    console.log("Contract balance after withdraw:", hre.ethers.utils.formatEther(contractBalance));
    console.log("Balance of owner after withdraw:", hre.ethers.utils.formatEther(ownerBalance));
};

const runMain = async () => {
    try{
        await main();
        process.exit(0);
    }catch(error) {
        console.log(error);
        process.exit(1);
    }
}
runMain();