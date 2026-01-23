import { store } from "@/redux/Store";
import { getHours } from "date-fns";
import { Linking } from "react-native";

export const sleep = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));


export const getInitials = (name: string) => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

export function openLinkInBrowser(url: string) {
  Linking.canOpenURL(url).then((canOpen) => canOpen && Linking.openURL(url))
};

export const getGreeting = (date = new Date()) => {
  const hour = getHours(date);
  if (hour >= 5 && hour < 12) return "Good Morning"
  if (hour >= 12 && hour < 17) return "Good Afternoon"
  if (hour >= 17 && hour < 21) return "Good Evening"
  return "Good Night"
};

export const alreadyExists = (ph: string) => {
  const allClients = store.getState().GymStates.allClients;
  return allClients?.some((item) => item.phoneNumber === ph);
};

export const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};