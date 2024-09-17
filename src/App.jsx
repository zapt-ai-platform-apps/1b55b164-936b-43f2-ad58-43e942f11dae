import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { supabase, createEvent } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-solid';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { SolidMarkdown } from 'solid-markdown';

function App() {
  const [user, setUser] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal('login');
  const [currentStep, setCurrentStep] = createSignal('questions');
  const [nameSuggestions, setNameSuggestions] = createSignal([]);
  const [selectedName, setSelectedName] = createSignal('');
  const [poem, setPoem] = createSignal('');
  const [loadingNames, setLoadingNames] = createSignal(false);
  const [loadingPoem, setLoadingPoem] = createSignal(false);
  const [style, setStyle] = createSignal('');
  const [language, setLanguage] = createSignal('');
  const [startingLetter, setStartingLetter] = createSignal('');
  const [meaning, setMeaning] = createSignal('');

  const checkUserSignedIn = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setCurrentPage('homePage');
    }
  };

  onMount(checkUserSignedIn);

  createEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
        setCurrentPage('homePage');
      } else {
        setUser(null);
        setCurrentPage('login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  });

  const fetchNameSuggestions = async () => {
    setLoadingNames(true);
    setNameSuggestions([]);
    const prompt = `Please suggest 10 unique and beautiful baby names based on the following preferences:
${style() ? `- Style: ${style()}` : ''}
${language() ? `- Language or cultural preferences: ${language()}` : ''}
${startingLetter() ? `- Starting letter: ${startingLetter()}` : ''}
${meaning() ? `- Desired meaning: ${meaning()}` : ''}
Provide the names as a JSON object with a "names" property, which is an array of 10 strings. The format should be:
{
  "names": ["name1", "name2", ..., "name10"]
}`;
    const dataInput = {
      prompt: prompt,
      response_type: 'json',
    };
    const output = await createEvent('chatgpt_request', dataInput);
    if (output) {
      if (Array.isArray(output.names)) {
        setNameSuggestions(output.names);
      } else {
        console.error('Response does not contain a valid names array');
      }
    } else {
      console.error('No output received from createEvent');
    }
    setLoadingNames(false);
  };

  const generatePoem = async (name) => {
    if (loadingPoem()) return;

    setSelectedName(name);
    setLoadingPoem(true);
    setPoem('');
    const prompt = `Please write a heartwarming poem about the name "${name}". Provide the response as a markdown string.`;
    const dataInput = {
      prompt: prompt,
      response_type: 'text',
    };
    const output = await createEvent('chatgpt_request', dataInput);
    if (output) {
      setPoem(output);
    } else {
      console.error('No output received from createEvent');
    }
    setLoadingPoem(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loadingNames()) return;
    setCurrentStep('nameSuggestions');
    await fetchNameSuggestions();
  };

  const goBack = () => {
    setCurrentStep('questions');
    setNameSuggestions([]);
    setSelectedName('');
    setPoem('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentPage('login');
  };

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <Show when={currentPage() === 'login'}>
        <div class="flex flex-col items-center w-full h-full px-4">
          <h1 class="text-2xl font-bold mb-2">Sign in with ZAPT</h1>
          <a href="https://www.zapt.ai" target="_blank" class="mb-4 text-blue-500 hover:underline">Visit ZAPT</a>
          <div class="w-full max-w-xl">
            <Auth
              supabaseClient={supabase}
              providers={['google', 'facebook', 'apple']}
              appearance={{ theme: ThemeSupa }}
            />
          </div>
        </div>
      </Show>
      <Show when={currentPage() === 'homePage'}>
        <div class="w-full max-w-4xl p-6 bg-white rounded-lg shadow-md h-full">
          <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">Name Suggestions App</h1>
            <button
              class="cursor-pointer px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
          <Show when={currentStep() === 'questions'}>
            <div class="flex flex-col items-center w-full">
              <h2 class="text-2xl font-semibold mb-4">Tell Us About Your Preferences</h2>
              <form class="w-full" onSubmit={handleSubmit}>
                <div class="mb-4">
                  <label class="block mb-2 text-gray-700">Preferred Style</label>
                  <input
                    type="text"
                    class="mt-1 block w-full box-border border-gray-300 rounded-md p-2"
                    value={style()}
                    onInput={(e) => setStyle(e.target.value)}
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-2 text-gray-700">Language or Cultural Preferences</label>
                  <input
                    type="text"
                    class="mt-1 block w-full box-border border-gray-300 rounded-md p-2"
                    value={language()}
                    onInput={(e) => setLanguage(e.target.value)}
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-2 text-gray-700">Starting Letter</label>
                  <input
                    type="text"
                    class="mt-1 block w-full box-border border-gray-300 rounded-md p-2"
                    value={startingLetter()}
                    onInput={(e) => setStartingLetter(e.target.value)}
                  />
                </div>
                <div class="mb-4">
                  <label class="block mb-2 text-gray-700">Desired Meaning</label>
                  <input
                    type="text"
                    class="mt-1 block w-full box-border border-gray-300 rounded-md p-2"
                    value={meaning()}
                    onInput={(e) => setMeaning(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  class="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mt-4 w-full"
                  disabled={loadingNames()}
                >
                  {loadingNames() ? 'Generating Names...' : 'Generate Names'}
                </button>
              </form>
            </div>
          </Show>
          <Show when={currentStep() === 'nameSuggestions'}>
            <div class="flex flex-col items-center w-full">
              <h2 class="text-2xl font-semibold mb-4">Name Suggestions</h2>
              <button
                class="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 mb-4"
                onClick={goBack}
                disabled={loadingPoem()}
              >
                Go Back
              </button>
              <Show when={loadingNames()}>
                <p>Loading name suggestions...</p>
              </Show>
              <Show when={!loadingNames()}>
                <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  <For each={nameSuggestions()}>
                    {(name) => (
                      <li
                        class={`bg-gray-100 p-4 rounded hover:bg-gray-200 ${
                          loadingPoem() ? '' : 'cursor-pointer'
                        }`}
                        onClick={!loadingPoem() ? () => generatePoem(name) : null}
                      >
                        {name}
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={loadingPoem()}>
                <p class="mt-4">Generating poem for "{selectedName()}"...</p>
              </Show>
              <Show when={!loadingPoem() && poem()}>
                <div class="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 w-full">
                  <h3 class="text-xl font-semibold mb-2">Poem for "{selectedName()}"</h3>
                  <div class="text-gray-700 prose">
                    <SolidMarkdown children={poem()} />
                  </div>
                </div>
              </Show>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export default App;