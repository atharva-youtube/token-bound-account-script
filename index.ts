import dotenv from "dotenv";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";

dotenv.config();

const config = {
  erc1155RegistryAddress: "0x000000006551c19487814612e58FE06813775758",
  erc1155Proxy: "0x55266d75D1a14E4572138116aF39863Ed6596E7F",
  erc1155AccountImplementation: "0x41C8f39463A868d3A88af00cd0fe7102F30E44eC",
};

async function main() {
  const sdk = ThirdwebSDK.fromPrivateKey(
    process.env.WALLET_PRIVATE_KEY!,
    "mumbai",
    { secretKey: process.env.THIRDWEB_SECRET_KEY }
  );

  // Deploy a NFT contract
  const nftContractAddress = await sdk.deployer.deployNFTCollection({
    name: "TBA NFT Contract",
    description: "This collection contains NFTs that are linked to TBAs",
    primary_sale_recipient: await sdk.wallet.getAddress(),
  });

  console.log(`NFT Contract deployed on ${nftContractAddress}`);

  // Mint an NFT
  const nftContract = await sdk.getContract(
    nftContractAddress,
    "nft-collection"
  );
  const newNFT = await nftContract.erc721.mint({
    name: "My first NFT",
    description: "This one is the first NFT linked to a TBA",
  });

  console.log(`Minted token ID ${newNFT.id}`);

  // Interact with TBA contract, create and fetch TBA
  const erc6551RegistryContract = await sdk.getContract(
    config.erc1155RegistryAddress,
    "custom"
  );

  await erc6551RegistryContract.call("createAccount", [
    config.erc1155AccountImplementation,
    "0x3132323300000000000000000000000000000000000000000000000000000000",
    await sdk.wallet.getChainId(),
    nftContractAddress,
    newNFT.id,
  ]);

  const tbaAddress = await erc6551RegistryContract.call("account", [
    config.erc1155AccountImplementation,
    "0x3132323300000000000000000000000000000000000000000000000000000000",
    await sdk.wallet.getChainId(),
    nftContractAddress,
    newNFT.id,
  ]);

  const tbaContract = await sdk.getContract(tbaAddress, "custom");

  // await tbaContract.call("initialize", [config.erc1155AccountImplementation]);

  console.log(`TBA address - ${tbaAddress}`);
  console.log(`Transferring a dummy NFT to TBA`);

  // Create a new NFT for transferring purposes
  const transferrableNFT = await nftContract.erc721.mint({
    name: "My second NFT",
    description: "This one is gonna get transferred",
  });

  const transferTxn = nftContract.erc721.transfer(
    tbaAddress,
    transferrableNFT.id
  );

  console.log(
    `Transferred to TBA - ${(await transferTxn).receipt.transactionHash}`
  );

  // Transfer from TBA to main account
  const encodedTxn = await nftContract.encoder.encode("transferFrom", [
    tbaAddress,
    await sdk.wallet.getAddress(),
    transferrableNFT.id,
  ]);
  const tbaTxn = await tbaContract.call("execute", [
    nftContractAddress,
    0,
    encodedTxn,
    0,
  ]);
  console.log(`TBA to account txn hash ${tbaTxn.receipt.transactionHash}`);
}

main();
