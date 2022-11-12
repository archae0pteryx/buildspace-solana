import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js'
import {
  FC,
  ReactChild,
  ReactFragment,
  ReactPortal,
  useEffect,
  useState,
} from 'react'
import styles from '../styles/custom.module.css'
import Image from 'next/image'

// const fetcher = (uri: RequestInfo | URL) =>
//   fetch(uri)
//     .then((res) => res.json())
//     .catch(console.error)

async function fetcher(uri: RequestInfo | URL) {
  const res = await fetch(uri)
  const json = await res.json()
  return json
}

export const FetchNft: FC = () => {
  const [nftData, setNftData] = useState([])

  const { connection } = useConnection()
  const wallet = useWallet()
  const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet))

  const fetchNfts = async () => {
    if (!wallet.connected) {
      return
    }

    const nfts = await metaplex
      .nfts()
      .findAllByOwner({ owner: wallet.publicKey })
      .run()

    const nftHasUri = nfts.filter((nft) => nft.uri)
    const nftData = await Promise.all(nftHasUri.map(({ uri }) => fetcher(uri)))
    setNftData(nftData)
  }

  useEffect(() => {
    fetchNfts()
  }, [wallet])

  return (
    <div>
      {nftData?.length && (
        <div className={styles.gridNFT}>
          {nftData.map((nft, i) => (
            <div key={i} >
              <p>{nft?.name}</p>
              <Image width={200} height={200} src={nft?.image} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
