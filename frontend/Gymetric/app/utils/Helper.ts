import { store } from "@/redux/Store";
import { getHours } from "date-fns";
import { Linking } from "react-native";
import { ClientOnBoardingType } from "./types";
import Toast from "react-native-toast-message";

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

export const validateNextStep = (form: ClientOnBoardingType, selectedMembership: { [key: string]: any }[]) => {
  const invalidDependent = form.dependents.find(dep => !dep.name?.trim() || !(dep.phoneNumber.length === 10));
  if (invalidDependent) {
    Toast.show({ type: 'error', text1: 'Incomplete depedent details' });
    return false;
  } else if (selectedMembership?.[0]?.planType === 'couple' && (form.primaryDetails.gender === form.dependents?.[0]?.gender)) {
    Toast.show({ type: 'error', text1: 'For Couple plan gender cannot be same' });
    return false;
  }
  return true;
};