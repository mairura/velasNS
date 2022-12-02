import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import {ethers} from "ethers";

import contractAbi from './utils/contractABI.json';
import light from './assets/light.png';
import ethLogo from './assets/ethlogo.png';
import logo from "./assets/logo.png";
import { networks } from './utils/networks';

// Constants
const TWITTER_HANDLE = 'ngenidevs';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

//Domain i would be minting
const tld = ".vlx"; 
const CONTRACT_ADDRESS="0xfe9938d3A0a888A07B9820AC5d68dddEf5c03cC7";

const App = () => {
	const [mints, setMints] = useState([]);
	//State variable to store networks
	const [network, setNetwork] = useState('');

	//State varibles to store user's public address
	const [currentAccount, setCurrentAccount] = useState("");

	//Some state varible data
	const [domain, setDomain] = useState("");
	const [loading, setLoading] = useState(false);
	const [record, setRecord] = useState("");
	 // Add a new stateful variable at the start of our component next to all the old ones
	const [editing, setEditing] = useState(false);

	//Implement connect wallet method
	const connectWallet = async () => {
		try{
			const { ethereum } = window;

			if(!ethereum) {
				alert("Get Metamask PLEASE!!🤝 https://metamask.io/");
				return;
			}

			//Fancy method to request access to account
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });

			//This prints out metamask public address once we authorize Metmask
			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		}catch(error) {
			console.log(error);
		}
	}

	//Switch Networks
	const switchNetwork = async () => {
		if (window.ethereum) {
		  try {
			// Try to switch to the Velas testnet
			await window.ethereum.request({
			  method: 'wallet_switchEthereumChain',
			  params: [{ chainId: '0x6f' }], // Check networks.js for hexadecimal network ids 0x13881
			});
		  } catch (error) {
			// This error code means that the chain we want has not been added to MetaMask
			// In this case we ask the user to add it to their MetaMask
			if (error.code === 4902) {
			  try {
				await window.ethereum.request({
				  method: 'wallet_addEthereumChain',
				  params: [
					{	
					  chainId: '0x6f',
					  chainName: 'Velas Network Testnet',
					  rpcUrls: ['https://api.testnet.velas.com'],
					  nativeCurrency: {
						  name: "Velas Network",
						  symbol: "VLX",
						  decimals: 18
					  },
					  blockExplorerUrls: ["https://api.testnet.velas.com'/"]
					},
				  ],
				});
			  } catch (error) {
				console.log(error);
			  }
			}
			console.log(error);
		  }
		} else {
		  // If window.ethereum is not found then MetaMask is not installed
		  alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		} 
	  }

	//Make sure this is async
	const checkIfWalletIsConnected = async () => {
		//First we make sure we have access to window.ethereum
		const { ethereum } = window;

		if(!ethereum) {
			console.log("Make sure you have metamask");
			return;
		}else {
			console.log("We have the ethereum object", ethereum);
		}

		//Check if we're authorised to access the user's wallets
		const accounts = await ethereum.request({method: "eth_accounts"});

		//User can have multiple authorised accounts, we grab the first one
		if(accounts.length !== 0) {
			const account = accounts[0];
			console.log("Found an authorized account:", account);
			setCurrentAccount(account);
		}else {
			console.log("No authorized account found");
		}

		//We check user's network chain ID
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);
	
		ethereum.on('chainChanged', handleChainChanged);
		
		// Reload the page when they change networks
		function handleChainChanged(_chainId) {
		  window.location.reload();
		}
	};

	const mintDomain = async () => {
		//DOn't run if domain is empty
		if(!domain) {return}
		//Alert the user if the domain is too short
		if(domain.length < 3) {
			alert("Domain must be atleast 3 characters long");
			return;
		}

		//Calculate price based on length of domain
		const price = domain.length === 3 ? "0.00005" : domain.length === 4 ? "0.00003" : "0.00001";
		console.log("Minting domain", domain, "with price", price);
		try{
			const  {ethereum } = window;
			if(ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi,signer);
				console.log("Going to pop wallet now to pay gas...");

				let tx = await contract.register(domain, { value: ethers.utils.parseEther(price)});
				//Wait for txn to be mined
				const receipt = await tx.wait();

				//Check if the tx was successfully completed
				if(receipt.status === 1) {
					console.log("Domain minted check it out https://evmexplorer.testnet.velas.com/tx/"+tx.hash);

					tx = await contract.setRecord(domain, record);
					await tx.wait();

					console.log("Record set https://evmexplorer.testnet.velas.com/tx/"+tx.hash);

					  
				// Call fetchMints after 2 seconds
				setTimeout(() => {
					fetchMints();
				}, 2000);

				setRecord("");
				setDomain("");

				}else{
					alert("Transaction failed! Please try again.");
				}
			}
		}catch(error){
			console.log(error);
		}
	}

	//Fetch all domains that we have minted before
	const fetchMints = async () => {
		try {
		  const { ethereum } = window;
		  if (ethereum) {
			// You know all this
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
			  
			// Get all the domain names from our contract
			const names = await contract.getAllNames();
			console.log("Names:", names);

			// For each name, get the record and the address
			const mintRecords = await Promise.all(names.map(async (name) => {
			const mintRecord = await contract.records(name);
			const owner = await contract.domains(name);
			return {
			  id: names.indexOf(name),
			  name: name,
			  record: mintRecord,
			  owner: owner,
			};
		  }));
	  
		  console.log("MINTS FETCHED ", mintRecords);
		  setMints(mintRecords);
		  }
		} catch(error){
		  console.log(error);
		}
	  }

	//Function to update our domains from frontend part
	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		  try {
		  const { ethereum } = window;
		  if (ethereum) {
			const provider = new ethers.providers.Web3Provider(ethereum);
			const signer = provider.getSigner();
			const contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi.abi, signer);
	  
			let tx = await contract.setRecord(domain, record);
			await tx.wait();
			console.log("Record set https://evmexplorer.testnet.velas.com/tx/"+tx.hash);
	  
			fetchMints();
			setRecord('');
			setDomain('');
		  }
		  } catch(error) {
			console.log(error);
		  }
		setLoading(false);
	  }

	//Function to render if wallet is not connected
	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">
			<img src="https://images6.fanpop.com/image/photos/37500000/Chi-typing-on-a-computer-chis-sweet-home-chis-new-address-37597964-320-240.gif" 
			alt="Guru gif" />
			{/* {connectWallet()} */}
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

	//Form to enter domain name and data
	const renderInputForm = () => {
		 // If not on Velas Testnet, render "Please connect to Velas Network Testnet"
		 if (network !== 'Velas Network Testnet') {
			return (
			  <div className="connect-wallet-container">
				<h2>Please connect to the Velas Network Testnet</h2>
				 {/* This button will call our switch network function */}
				 <button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch to Velas</button>
			  </div>
			);
		  }
		
		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='Domain name'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='Hint to recall domain'
					onChange={e => setRecord(e.target.value)}
				/>

				 {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
				 {editing ? (
				<div className="button-container">
					{/* This will call the updateDomain function we just made */}
					<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
						Set record
					</button>  
					{/* This will let us get out of editing mode by setting editing to false */}
					<button className='cta-button mint-button' onClick={() => {setEditing(false)}}>
						Cancel
					</button>  
				</div>
				) : (
					// If editing is not true, the mint button will be returned instead
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>  
          		)}
			</div>
		);
	}

	// Add this render function next to your other render functions
const renderMints = () => {
	if (currentAccount && mints.length > 0) {
	  return (
		<div className="mint-container">
		  <b className="subtitle"> Recently minted domains!</b>
		  <div className="mint-list">
			{ mints.map((mint, index) => {
			  return (
				<div className="mint-item" key={index}>
				  <div className='mint-row'>
					<a className="link" href={"Sorry Velas NFT testnet Marketplace is coming soon!"} target="_blank" rel="noopener noreferrer">
					  <p className="underlined">{' '}{mint.name}{tld}{' '}</p>
					</a>
					{/* If mint.owner is currentAccount, add an "edit" button*/}
					{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
					  <button className="edit-button" onClick={() => editRecord(mint.name)}>
						<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
					  </button>
					  :
					  null
					}
				  </div>
			<p> {mint.record} </p>
		  </div>)
		  })}
		</div>
	  </div>);
	}
  };
  
  // This will take us into edit mode and show us the edit buttons!
  const editRecord = (name) => {
	console.log("Editing record for", name);
	setEditing(true);
	setDomain(name);
  }

	//This runs our function when the page reloads
	useEffect(() => {
		checkIfWalletIsConnected();
	},[]);

	// This will run any time currentAccount or network are changed
	useEffect(() => {
		if (network === 'Velas Network Testnet') {
		fetchMints();
		}
	}, [currentAccount, network]);


  return (
		<div className="App">
			<div className="container">
				<div className="header-container">
					<header>
						<div className="left">
							<img src={logo} alt="logo"/>
							<br /><br />
							<p className="title">&nbsp;Velas Name Service</p>
							<p className="subtitle">&nbsp;We supply for the blockchain</p>
						</div>
						{/* Display a logo and wallet connection status*/}
						<div className="right">
							<img alt="Network logo" className="logo" src={ network.includes("Velas") ? light : ethLogo} />
							{ currentAccount ? <p> Address: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p> }
						</div>
					</header>
				</div>
				{/* This will hide the connect button if currentAccount isn't empty*/}
				{!currentAccount && renderNotConnectedContainer()}

				{/* Render the input form if an account is connected */}
				{currentAccount && renderInputForm()}
				{mints && renderMints()}

       			<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE}`}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
