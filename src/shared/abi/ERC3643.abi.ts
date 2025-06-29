export const ERC3643_ABI = [
    {
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "mint",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "from", "type": "address"},
            {"name": "amount", "type": "uint256"}
        ],
        "name": "burn",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "identityRegistry",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "compliance",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export const IDENTITY_REGISTRY_ABI = [
    {
        "inputs": [
            {"name": "_user", "type": "address"},
            {"name": "_identity", "type": "address"},
            {"name": "_country", "type": "uint16"}
        ],
        "name": "registerIdentity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_userAddress", "type": "address"}],
        "name": "isVerified",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "_userAddress", "type": "address"}],
        "name": "identity",
        "outputs": [{"name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_user", "type": "address"},
            {"name": "_identity", "type": "address"}
        ],
        "name": "updateIdentity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_user", "type": "address"}],
        "name": "deleteIdentity",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "_userAddress", "type": "address"}],
        "name": "investorCountry",
        "outputs": [{"name": "", "type": "uint16"}],
        "stateMutability": "view",
        "type": "function"
    }
];

export const COMPLIANCE_ABI = [
    {
        "inputs": [
            {"name": "_from", "type": "address"},
            {"name": "_to", "type": "address"},
            {"name": "_amount", "type": "uint256"}
        ],
        "name": "canTransfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"name": "_userAddress", "type": "address"},
            {"name": "_claimTopic", "type": "uint256"}
        ],
        "name": "isClaimValid",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];