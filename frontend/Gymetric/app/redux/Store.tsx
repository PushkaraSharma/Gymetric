import { configureStore } from "@reduxjs/toolkit";
import GymStates from "./state/GymStates";

export const store = configureStore({
    reducer: { GymStates },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: false
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;