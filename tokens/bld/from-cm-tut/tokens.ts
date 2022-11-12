import { initializeKeypair } from '../initializeKeypair'
import * as Web3 from '@solana/web3.js'
import * as token from '@solana/spl-token'
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
} from '@metaplex-foundation/js'
import {
  DataV2,
  createCreateMetadataAccountV2Instruction,
  createUpdateMetadataAccountV2Instruction,
} from '@metaplex-foundation/mpl-token-metadata'
import * as fs from 'fs'

async function createTokenMetadata(
  connection: Web3.Connection,
  metaplex: Metaplex,
  mint: Web3.PublicKey,
  user: Web3.Keypair,
  name: string,
  symbol: string,
  description: string
) {
  // file to buffer
  const buffer = fs.readFileSync('assets/smoke_stack1.jpg')

  // buffer to metaplex file
  const file = toMetaplexFile(buffer, 'smoke_stack1.jpg')

  // upload image and get image uri
  const imageUri = await metaplex.storage().upload(file)
  console.log('image uri:', imageUri)

  // upload metadata and get metadata uri (off chain metadata)
  const { uri } = await metaplex.nfts().uploadMetadata({
    name: name,
    description: description,
    image: imageUri,
  })

  console.log('metadata uri:', uri)

  // get metadata account address
  const metadataPDA = metaplex.nfts().pdas().metadata({mint})

  // onchain metadata format
  const tokenMetadata = {
    name: name,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: 0,
    creators: null,
    collection: null,
    uses: null,
  } as DataV2

  // transaction to create metadata account
  const transaction = new Web3.Transaction().add(
    createCreateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        mint: mint,
        mintAuthority: user.publicKey,
        payer: user.publicKey,
        updateAuthority: user.publicKey,
      },
      {
        createMetadataAccountArgsV2: {
          data: tokenMetadata,
          isMutable: true,
        },
      }
    )
  )

  // send transaction
  const transactionSignature = await Web3.sendAndConfirmTransaction(
    connection,
    transaction,
    [user]
  )

  console.log(
    `Create Metadata Account: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}


async function createNewMint(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  mintAuthority: Web3.PublicKey,
  freezeAuthority: Web3.PublicKey,
  decimals: number
): Promise<Web3.PublicKey> {
  const tokenMint = await token.createMint(
    connection,
    payer,
    mintAuthority,
    freezeAuthority,
    decimals
  )

  console.log(`The token mint account address is ${tokenMint}`)
  console.log(
    `Token Mint: https://explorer.solana.com/address/${tokenMint}?cluster=devnet`
  )

  return tokenMint
}

async function createTokenAccount(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  mint: Web3.PublicKey,
  owner: Web3.PublicKey
) {
  const tokenAccount = await token.getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    owner
  )

  console.log(
    `Token Account: https://explorer.solana.com/address/${tokenAccount.address}?cluster=devnet`
  )

  return tokenAccount
}

async function mintTokens(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  mint: Web3.PublicKey,
  destination: Web3.PublicKey,
  authority: Web3.Keypair,
  amount: number
) {
  const mintInfo = await token.getMint(connection, mint)

  const transactionSignature = await token.mintTo(
    connection,
    payer,
    mint,
    destination,
    authority,
    amount * 10 ** mintInfo.decimals
  )

  console.log(
    `Mint Token Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function transferTokens(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  source: Web3.PublicKey,
  destination: Web3.PublicKey,
  owner: Web3.PublicKey,
  amount: number,
  mint: Web3.PublicKey
) {
  const mintInfo = await token.getMint(connection, mint)

  const transactionSignature = await token.transfer(
    connection,
    payer,
    source,
    destination,
    owner,
    amount * 10 ** mintInfo.decimals
  )

  console.log(
    `Transfer Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

async function burnTokens(
  connection: Web3.Connection,
  payer: Web3.Keypair,
  account: Web3.PublicKey,
  mint: Web3.PublicKey,
  owner: Web3.Keypair,
  amount: number
) {
  const transactionSignature = await token.burn(
    connection,
    payer,
    account,
    mint,
    owner,
    amount
  )

  console.log(
    `Burn Transaction: https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`
  )
}

// async function main() {
//   const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'))
//   const user = await initializeKeypair(connection)

//   console.log('PublicKey:', user.publicKey.toBase58())

//   const mint = await createNewMint(
//     connection,
//     user, // We'll pay the fees
//     user.publicKey, // We're the mint authority
//     user.publicKey, // And the freeze authority >:)
//     2 // Only two decimals!
//   )

//   const tokenAccount = await createTokenAccount(
//     connection,
//     user,
//     mint,
//     user.publicKey // Associating our address with the token account
//   )

//   // Mint 100 tokens to our address
//   await mintTokens(connection, user, mint, tokenAccount.address, user, 100)
// }

async function main() {
  const MINT_ADDRESS = 'G8p6NUb8dB8mALEhdVcr1dNodaQULS4wfUf9f9yyCppH'

  const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'))
  const user = await initializeKeypair(connection)

  console.log('PublicKey:', user.publicKey.toBase58())


  // metaplex setup
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: 'https://devnet.bundlr.network',
        providerUrl: 'https://api.devnet.solana.com',
        timeout: 60000,
      })
    )

  // Calling the token
  await createTokenMetadata(
    connection,
    metaplex,
    new Web3.PublicKey(MINT_ADDRESS),
    user,
    'FOOBAR',
    'FOO',
    'Your moms face'
  )
}

main()
  .then(() => {
    console.log('Finished successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
