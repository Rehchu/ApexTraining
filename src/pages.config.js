/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AdminBugs from './pages/AdminBugs';
import AdminContactMessages from './pages/AdminContactMessages';
import BusinessHub from './pages/BusinessHub';
import CRM from './pages/CRM';
import ClientCommunity from './pages/ClientCommunity';
import ClientDashboard from './pages/ClientDashboard';
import ClientHabits from './pages/ClientHabits';
import ClientJournal from './pages/ClientJournal';
import ClientDocuments from './pages/ClientDocuments';
import ClientMeals from './pages/ClientMeals';
import ClientOnboarding from './pages/ClientOnboarding';
import ClientProfile from './pages/ClientProfile';
import ClientProgress from './pages/ClientProgress';
import ClientRecovery from './pages/ClientRecovery';
import ClientResources from './pages/ClientResources';
import ClientSchedule from './pages/ClientSchedule';
import ClientWorkouts from './pages/ClientWorkouts';
import Clients from './pages/Clients';
import Contact from './pages/Contact';
import Contracts from './pages/Contracts';
import Dashboard from './pages/Dashboard';
import DataPolicy from './pages/DataPolicy';
import FitnessTools from './pages/FitnessTools';
import Home from './pages/Home';
import IndependentOnboarding from './pages/IndependentOnboarding';
import Meals from './pages/Meals';
import MyPet from './pages/MyPet';
import Messages from './pages/Messages';
import OnboardingWalkthrough from './pages/OnboardingWalkthrough';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Progress from './pages/Progress';
import PublicHome from './pages/PublicHome';
import Recipes from './pages/Recipes';
import ReportBug from './pages/ReportBug';
import Resources from './pages/Resources';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import TrainerAssistant from './pages/TrainerAssistant';
import TrainerCommunity from './pages/TrainerCommunity';
import TrainerExpenses from './pages/TrainerExpenses';
import TrainerJournalInsights from './pages/TrainerJournalInsights';
import WaitingList from './pages/WaitingList';
import Workouts from './pages/Workouts';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBugs": AdminBugs,
    "AdminContactMessages": AdminContactMessages,
    "BusinessHub": BusinessHub,
    "CRM": CRM,
    "ClientCommunity": ClientCommunity,
    "ClientDashboard": ClientDashboard,
    "ClientHabits": ClientHabits,
    "ClientJournal": ClientJournal,
    "ClientDocuments": ClientDocuments,
    "ClientMeals": ClientMeals,
    "ClientOnboarding": ClientOnboarding,
    "ClientProfile": ClientProfile,
    "ClientProgress": ClientProgress,
    "ClientRecovery": ClientRecovery,
    "ClientResources": ClientResources,
    "ClientSchedule": ClientSchedule,
    "ClientWorkouts": ClientWorkouts,
    "Clients": Clients,
    "Contact": Contact,
    "Contracts": Contracts,
    "Dashboard": Dashboard,
    "DataPolicy": DataPolicy,
    "FitnessTools": FitnessTools,
    "Home": Home,
    "IndependentOnboarding": IndependentOnboarding,
    "Meals": Meals,
    "MyPet": MyPet,
    "Messages": Messages,
    "OnboardingWalkthrough": OnboardingWalkthrough,
    "PrivacyPolicy": PrivacyPolicy,
    "Progress": Progress,
    "PublicHome": PublicHome,
    "Recipes": Recipes,
    "ReportBug": ReportBug,
    "Resources": Resources,
    "Schedule": Schedule,
    "Settings": Settings,
    "Terms": Terms,
    "TrainerAssistant": TrainerAssistant,
    "TrainerCommunity": TrainerCommunity,
    "TrainerExpenses": TrainerExpenses,
    "TrainerJournalInsights": TrainerJournalInsights,
    "WaitingList": WaitingList,
    "Workouts": Workouts,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};