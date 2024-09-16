import { createSignal, createEffect, onMount, Show, For } from 'solid-js';
import { supabase, createEvent } from './supabaseClient';
import { Auth } from '@supabase/auth-ui-solid';
import { ThemeSupa } from '@supabase/auth-ui-shared';

function App() {
  const [user, setUser] = createSignal(null);
  const [currentPage, setCurrentPage] = createSignal('login');
  const [nameSuggestions, setNameSuggestions] = createSignal([]);
  const [selectedName, setSelectedName] = createSignal('');
  const [poem, setPoem] = createSignal('');
  const [loadingNames, setLoadingNames] = createSignal(false);
  const [loadingPoem, setLoadingPoem] = createSignal(false);

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
    const prompt = "Please suggest 10 unique and beautiful baby names. Provide the names as a JSON array of strings.";
    const dataInput = {
      prompt: prompt,
      response_type: 'json',
    };
    const output = await createEvent('chatgpt_request', dataInput);
    if (output && output.response) {
      try {
        const names = JSON.parse(output.response);
        setNameSuggestions(names);
      } catch (e) {
        console.error('Error parsing names:', e);
      }
    }
    setLoadingNames(false);
  };

  const generatePoem = async (name) => {
    if (loadingPoem()) return;

    setSelectedName(name);
    setLoadingPoem(true);
    setPoem('');
    const prompt = `Please write a heartwarming poem about the name "${name}".`;
    const dataInput = {
      prompt: prompt,
      response_type: 'text',
    };
    const output = await createEvent('chatgpt_request', dataInput);
    if (output && output.response) {
      setPoem(output.response);
    }
    setLoadingPoem(false);
  };

  // Fetch name suggestions when homePage loads
  createEffect(() => {
    if (currentPage() === 'homePage') {
      fetchNameSuggestions();
    }
  });

  return (
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-800">
      <Show when={currentPage() === 'login'}>
        <div class="flex flex-col items-center">
          <h1 class="text-2xl font-bold mb-2">Sign in with ZAPT</h1>
          <a href="https://www.zapt.ai" target="_blank" class="mb-4 text-blue-500 hover:underline">Visit ZAPT</a>
          <Auth supabaseClient={supabase} providers={['google', 'facebook', 'apple']} appearance={{ theme: ThemeSupa }} />
        </div>
      </Show>
      <Show when={currentPage() === 'homePage'}>
        <div class="flex flex-col items-center w-full h-full">
          <h1 class="text-3xl font-bold my-4">Name Suggestions</h1>
          <Show when={loadingNames()}>
            <p>Loading name suggestions...</p>
          </Show>
          <Show when={!loadingNames()}>
            <ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full px-4">
              <For each={nameSuggestions()}>
                {(name) => (
                  <li
                    class="cursor-pointer bg-white p-4 rounded shadow hover:bg-gray-200"
                    onClick={() => generatePoem(name)}
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
            <div class="mt-4 p-4 bg-white rounded shadow w-full max-w-2xl">
              <h2 class="text-2xl font-bold mb-2">Poem for "{selectedName()}"</h2>
              <p>{poem()}</p>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

export default App;