import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js'
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
} from '@metaplex-foundation/js'
import * as fs from 'fs'
import * as Web3 from '@solana/web3.js'
import { initializeKeypair } from '../initializeKeypair'

const TOKEN_NAME = 'Smoke Stacks'
const DESCRIPTION = 'Its only steam!'
const SYMBOL = 'Smoke Stack'
const SELLER_FEE_BASIS_POINTS = 100
const IMAGE_FILE = 'stacks.jpg'

;(async () => {
  try {
    const connection = new Web3.Connection(Web3.clusterApiUrl('devnet'))
    const user = await initializeKeypair(connection)

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(user))
      .use(
        bundlrStorage({
          address: 'https://devnet.bundlr.network',
          providerUrl: 'https://api.devnet.solana.com',
          timeout: 60000,
        })
      )

    const buffer = fs.readFileSync('assets/' + IMAGE_FILE)

    // buffer to metaplex file
    const file = toMetaplexFile(buffer, IMAGE_FILE)

    // upload image and get image uri
    const imageUri = await metaplex.storage().upload(file)
    console.log('image uri:', imageUri)

    const { uri } = await metaplex
      .nfts()
      .uploadMetadata({
        name: TOKEN_NAME,
        description: DESCRIPTION,
        image: imageUri,
      })

    console.log('metadata uri:', uri)
    // await createNft(metaplex, uri)
    await updateNft(
      metaplex,
      uri,
      new Web3.PublicKey('3QnZzWQzqPuf2QutEB7MGHgCUAw3q1WY9zyt8b2Xxy1B')
    )
  } catch (err) {
    console.error(err)
  }
})()

async function createNft(
  metaplex: Metaplex,
  uri: string
): Promise<NftWithToken> {
  const { nft } = await metaplex
    .nfts()
    .create({
      uri: uri,
      name: TOKEN_NAME,
      sellerFeeBasisPoints: SELLER_FEE_BASIS_POINTS,
      symbol: SYMBOL,
    })

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  )

  return nft
}

async function updateNft(
  metaplex: Metaplex,
  uri: string,
  mintAddress: PublicKey
) {
  // get "NftWithToken" type from mint address
  const nft = await metaplex.nfts().findByMint({ mintAddress })

  // omit any fields to keep unchanged
  await metaplex.nfts().update({
    nftOrSft: nft,
    name: TOKEN_NAME,
    symbol: SYMBOL,
    uri: uri,
    sellerFeeBasisPoints: SELLER_FEE_BASIS_POINTS,
  })

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  )
}
