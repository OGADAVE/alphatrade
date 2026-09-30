"use client";

import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";

export async function toggleWatchlistSymbol(uid: string, symbol: string, currentlyWatching: boolean) {
  await updateDoc(doc(db, "users", uid), {
    watchlist: currentlyWatching ? arrayRemove(symbol) : arrayUnion(symbol),
  });
}

export async function toggleFollowStrategy(uid: string, strategyId: string, currentlyFollowing: boolean) {
  await updateDoc(doc(db, "users", uid), {
    followedStrategyIds: currentlyFollowing ? arrayRemove(strategyId) : arrayUnion(strategyId),
  });
}

export async function toggleFavoriteSignal(uid: string, signalId: string, currentlyFavorited: boolean) {
  await updateDoc(doc(db, "users", uid), {
    favoriteSignalIds: currentlyFavorited ? arrayRemove(signalId) : arrayUnion(signalId),
  });
}
