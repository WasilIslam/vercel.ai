import 'server-only'
import programs from "@/assets/other_programs.json"
import {
  createAI,
  createStreamableUI,
  getMutableAIState,
  getAIState,
  streamUI,
  createStreamableValue
} from 'ai/rsc'
import { openai } from '@ai-sdk/openai'

import {
  spinner,
  BotCard,
  BotMessage,
  SystemMessage,
  Stock,
  Purchase
} from '@/components/stocks'

import { z } from 'zod'
import { EventsSkeleton } from '@/components/stocks/events-skeleton'
import { Events } from '@/components/stocks/events'
import { StocksSkeleton } from '@/components/stocks/stocks-skeleton'
import { Stocks } from '@/components/stocks/stocks'
import { StockSkeleton } from '@/components/stocks/stock-skeleton'
import {
  formatNumber,
  runAsyncFnWithoutBlocking,
  sleep,
  nanoid
} from '@/lib/utils'
import { saveChat } from '@/app/actions'
import { SpinnerMessage, UserMessage } from '@/components/stocks/message'
import { Chat, Message } from '@/lib/types'
import { auth } from '@/auth'

async function confirmPurchase(symbol: string, price: number, amount: number) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  const purchasing = createStreamableUI(
    <div className="inline-flex items-start gap-1 md:items-center">
      {spinner}
      <p className="mb-2">
        Purchasing {amount} ${symbol}...
      </p>
    </div>
  )

  const systemMessage = createStreamableUI(null)

  runAsyncFnWithoutBlocking(async () => {
    await sleep(1000)

    purchasing.update(
      <div className="inline-flex items-start gap-1 md:items-center">
        {spinner}
        <p className="mb-2">
          Purchasing {amount} ${symbol}... working on it...
        </p>
      </div>
    )

    await sleep(1000)

    purchasing.done(
      <div>
        <p className="mb-2">
          You have successfully purchased {amount} ${symbol}. Total cost:{' '}
          {formatNumber(amount * price)}
        </p>
      </div>
    )

    systemMessage.done(
      <SystemMessage>
        You have purchased {amount} shares of {symbol} at ${price}. Total cost ={' '}
        {formatNumber(amount * price)}.
      </SystemMessage>
    )

    aiState.done({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: nanoid(),
          role: 'system',
          content: `[User has purchased ${amount} shares of ${symbol} at ${price}. Total cost = ${
            amount * price
          }]`
        }
      ]
    })
  })

  return {
    purchasingUI: purchasing.value,
    newMessage: {
      id: nanoid(),
      display: systemMessage.value
    }
  }
}

async function submitUserMessage(content: string) {
  'use server'

  const aiState = getMutableAIState<typeof AI>()

  aiState.update({
    ...aiState.get(),
    messages: [
      ...aiState.get().messages,
      {
        id: nanoid(),
        role: 'user',
        content
      }
    ]
  })

  let textStream: undefined | ReturnType<typeof createStreamableValue<string>>
  let textNode: undefined | React.ReactNode

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    initial: <SpinnerMessage />,
    system: `\
Greet the user and offer the following programs to choose from:

SNAP (Supplemental Nutrition Assistance Program)
WIC (Women, Infants, and Children)
Lifeline (Low income )
Ask relevant questions based on the selected program:

For SNAP: "Do you have Medicaid or MassHealth?"
For WIC: "Are you a pregnant mother, postpartum, or do you have a child under 5?"
For Lifeline: "Do you have Medicaid or MassHealth?"
After verification is done, provide if they are eligible or not, also provide the program's application link regardless:

SNAP: internal_link.com/snap
WIC: internal_link.com/wic
Lifeline: internal_link.com/lifeline


If the question is about another program and not about snap wic or lifeline. Answer this based on the array only in simple text: ${JSON.stringify(programs)}
Finally, keep responses short interesting and engaging and return the response is a formatted way.
    `,
    messages: [
      ...aiState.get().messages.map((message: any) => ({
        role: message.role,
        content: message.content,
        name: message.name
      }))
    ],
    text: ({ content, done, delta }) => {
      if (!textStream) {
        textStream = createStreamableValue('')
        textNode = <BotMessage content={textStream.value} />
      }

      if (done) {
        textStream.done()
        aiState.done({
          ...aiState.get(),
          messages: [
            ...aiState.get().messages,
            {
              id: nanoid(),
              role: 'assistant',
              content
            }
          ]
        })
      } else {
        textStream.update(delta)
      }

      return textNode
    },
    // tools: {
    //   get_other_program_details: {
    //     description: 'Get program details by name.',
    //     parameters: z.object({
    //       programName: z.string().describe('The name of the program not applicable on snap, wic and lifeline'),
    //       question:z.string().describe("The question asked by the user")
    //     }),
    //     generate: async function* ({ programName }) {
    //       // Inline ProgramSkeleton component
    //       const ProgramSkeleton = () => {
    //         return (
    //           <div className="skeleton-container">
    //             <div
    //               className="skeleton-title"
    //               style={{
    //                 width: '200px',
    //                 height: '20px',
    //                 backgroundColor: '#ddd',
    //                 margin: '10px 0'
    //               }}
    //             />
    //             <div
    //               className="skeleton-text"
    //               style={{
    //                 width: '100%',
    //                 height: '15px',
    //                 backgroundColor: '#eee',
    //                 margin: '8px 0'
    //               }}
    //             />
    //             <div
    //               className="skeleton-text"
    //               style={{
    //                 width: '90%',
    //                 height: '15px',
    //                 backgroundColor: '#eee',
    //                 margin: '8px 0'
    //               }}
    //             />
    //             <div
    //               className="skeleton-text"
    //               style={{
    //                 width: '85%',
    //                 height: '15px',
    //                 backgroundColor: '#eee',
    //                 margin: '8px 0'
    //               }}
    //             />
    //             <div
    //               className="skeleton-text"
    //               style={{
    //                 width: '80%',
    //                 height: '15px',
    //                 backgroundColor: '#eee',
    //                 margin: '8px 0'
    //               }}
    //             />
    //           </div>
    //         )
    //       }

    //       // Inline ProgramDetails component
    //       const ProgramDetails = ({ program }) => {
    //         return (
    //           <div className="program-details">
    //             <h2>{program.program}</h2>
    //             <p>{program.description}</p>

    //             <h3>Benefits:</h3>
    //             <ul>
    //               {program.benefits.map((benefit, index) => (
    //                 <li key={index}>{benefit}</li>
    //               ))}
    //             </ul>

    //             <h3>Contact Information:</h3>
    //             <p>Agency: {program.contact_info.agency}</p>
    //             <p>Phone: {program.contact_info.phone}</p>

    //             <h3>Links to Apply:</h3>
    //             <ul>
    //               {program.links_to_apply.map((link, index) => (
    //                 <li key={index}>
    //                   <a href={link} target="_blank" rel="noopener noreferrer">
    //                     {link}
    //                   </a>
    //                 </li>
    //               ))}
    //             </ul>

    //             <h3>Eligibility Criteria:</h3>
    //             <ul>
    //               {program.eligibility_criteria.map((criteria, index) => (
    //                 <li key={index}>{criteria}</li>
    //               ))}
    //             </ul>
    //           </div>
    //         )
    //       }

    //       yield <ProgramSkeleton />

    //       await sleep(1000)

    //       const toolCallId = nanoid()
    //       const program = programs.find(p => 
    //         p.program.toLowerCase().includes(programName.toLowerCase())
    //       );

    //       if (!program) {
    //         aiState.done({
    //           ...aiState.get(),
    //           messages: [
    //             ...aiState.get().messages,
    //             {
    //               id: nanoid(),
    //               role: 'assistant',
    //               content: `No program found with the name "${programName}". Please try again.`
    //             }
    //           ]
    //         })
    //         return
    //       }

    //       aiState.done({
    //         ...aiState.get(),
    //         messages: [
    //           ...aiState.get().messages,
    //           {
    //             id: nanoid(),
    //             role: 'assistant',
    //             content: [
    //               {
    //                 type: 'tool-call',
    //                 toolName: 'get_other_program_details',
    //                 toolCallId,
    //                 args: { programName }
    //               }
    //             ]
    //           },
    //           {
    //             id: nanoid(),
    //             role: 'tool',
    //             content: [
    //               {
    //                 type: 'tool-result',
    //                 toolName: 'get_other_program_details',
    //                 toolCallId,
    //                 result: program
    //               }
    //             ]
    //           }
    //         ]
    //       })

    //       return <ProgramDetails program={program} />
    //     }
    //   }
    //   // listStocks: {
    //   //   description: 'List three imaginary stocks that are trending.',
    //   //   parameters: z.object({
    //   //     stocks: z.array(
    //   //       z.object({
    //   //         symbol: z.string().describe('The symbol of the stock'),
    //   //         price: z.number().describe('The price of the stock'),
    //   //         delta: z.number().describe('The change in price of the stock')
    //   //       })
    //   //     )
    //   //   }),
    //   //   generate: async function* ({ stocks }) {
    //   //     yield (
    //   //       <BotCard>
    //   //         <StocksSkeleton />
    //   //       </BotCard>
    //   //     )

    //   //     await sleep(1000)

    //   //     const toolCallId = nanoid()

    //   //     aiState.done({
    //   //       ...aiState.get(),
    //   //       messages: [
    //   //         ...aiState.get().messages,
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'assistant',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-call',
    //   //               toolName: 'listStocks',
    //   //               toolCallId,
    //   //               args: { stocks }
    //   //             }
    //   //           ]
    //   //         },
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'tool',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-result',
    //   //               toolName: 'listStocks',
    //   //               toolCallId,
    //   //               result: stocks
    //   //             }
    //   //           ]
    //   //         }
    //   //       ]
    //   //     })

    //   //     return (
    //   //       <BotCard>
    //   //         <Stocks props={stocks} />
    //   //       </BotCard>
    //   //     )
    //   //   }
    //   // },
    //   // showStockPrice: {
    //   //   description:
    //   //     'Get the current stock price of a given stock or currency. Use this to show the price to the user.',
    //   //   parameters: z.object({
    //   //     symbol: z
    //   //       .string()
    //   //       .describe(
    //   //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
    //   //       ),
    //   //     price: z.number().describe('The price of the stock.'),
    //   //     delta: z.number().describe('The change in price of the stock')
    //   //   }),
    //   //   generate: async function* ({ symbol, price, delta }) {
    //   //     yield (
    //   //       <BotCard>
    //   //         <StockSkeleton />
    //   //       </BotCard>
    //   //     )

    //   //     await sleep(1000)

    //   //     const toolCallId = nanoid()

    //   //     aiState.done({
    //   //       ...aiState.get(),
    //   //       messages: [
    //   //         ...aiState.get().messages,
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'assistant',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-call',
    //   //               toolName: 'showStockPrice',
    //   //               toolCallId,
    //   //               args: { symbol, price, delta }
    //   //             }
    //   //           ]
    //   //         },
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'tool',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-result',
    //   //               toolName: 'showStockPrice',
    //   //               toolCallId,
    //   //               result: { symbol, price, delta }
    //   //             }
    //   //           ]
    //   //         }
    //   //       ]
    //   //     })

    //   //     return (
    //   //       <BotCard>
    //   //         <Stock props={{ symbol, price, delta }} />
    //   //       </BotCard>
    //   //     )
    //   //   }
    //   // },
    //   // showStockPurchase: {
    //   //   description:
    //   //     'Show price and the UI to purchase a stock or currency. Use this if the user wants to purchase a stock or currency.',
    //   //   parameters: z.object({
    //   //     symbol: z
    //   //       .string()
    //   //       .describe(
    //   //         'The name or symbol of the stock or currency. e.g. DOGE/AAPL/USD.'
    //   //       ),
    //   //     price: z.number().describe('The price of the stock.'),
    //   //     numberOfShares: z
    //   //       .number()
    //   //       .optional()
    //   //       .describe(
    //   //         'The **number of shares** for a stock or currency to purchase. Can be optional if the user did not specify it.'
    //   //       )
    //   //   }),
    //   //   generate: async function* ({ symbol, price, numberOfShares = 100 }) {
    //   //     const toolCallId = nanoid()

    //   //     if (numberOfShares <= 0 || numberOfShares > 1000) {
    //   //       aiState.done({
    //   //         ...aiState.get(),
    //   //         messages: [
    //   //           ...aiState.get().messages,
    //   //           {
    //   //             id: nanoid(),
    //   //             role: 'assistant',
    //   //             content: [
    //   //               {
    //   //                 type: 'tool-call',
    //   //                 toolName: 'showStockPurchase',
    //   //                 toolCallId,
    //   //                 args: { symbol, price, numberOfShares }
    //   //               }
    //   //             ]
    //   //           },
    //   //           {
    //   //             id: nanoid(),
    //   //             role: 'tool',
    //   //             content: [
    //   //               {
    //   //                 type: 'tool-result',
    //   //                 toolName: 'showStockPurchase',
    //   //                 toolCallId,
    //   //                 result: {
    //   //                   symbol,
    //   //                   price,
    //   //                   numberOfShares,
    //   //                   status: 'expired'
    //   //                 }
    //   //               }
    //   //             ]
    //   //           },
    //   //           {
    //   //             id: nanoid(),
    //   //             role: 'system',
    //   //             content: `[User has selected an invalid amount]`
    //   //           }
    //   //         ]
    //   //       })

    //   //       return <BotMessage content={'Invalid amount'} />
    //   //     } else {
    //   //       aiState.done({
    //   //         ...aiState.get(),
    //   //         messages: [
    //   //           ...aiState.get().messages,
    //   //           {
    //   //             id: nanoid(),
    //   //             role: 'assistant',
    //   //             content: [
    //   //               {
    //   //                 type: 'tool-call',
    //   //                 toolName: 'showStockPurchase',
    //   //                 toolCallId,
    //   //                 args: { symbol, price, numberOfShares }
    //   //               }
    //   //             ]
    //   //           },
    //   //           {
    //   //             id: nanoid(),
    //   //             role: 'tool',
    //   //             content: [
    //   //               {
    //   //                 type: 'tool-result',
    //   //                 toolName: 'showStockPurchase',
    //   //                 toolCallId,
    //   //                 result: {
    //   //                   symbol,
    //   //                   price,
    //   //                   numberOfShares
    //   //                 }
    //   //               }
    //   //             ]
    //   //           }
    //   //         ]
    //   //       })

    //   //       return (
    //   //         <BotCard>
    //   //           <Purchase
    //   //             props={{
    //   //               numberOfShares,
    //   //               symbol,
    //   //               price: +price,
    //   //               status: 'requires_action'
    //   //             }}
    //   //           />
    //   //         </BotCard>
    //   //       )
    //   //     }
    //   //   }
    //   // },
    //   // getGrants: {
    //   //   description:
    //   //     'Fetch information about specific government assistance grants such as SNAP, WIC, and Lifeline based on user criteria.',
    //   //   parameters: z.object({
    //   //     grants: z.array(
    //   //       z.object({
    //   //         name: z.string().describe('The name of the grant'),
    //   //         description: z
    //   //           .string()
    //   //           .describe('A brief description of the grant'),
    //   //         eligibility: z
    //   //           .string()
    //   //           .describe('Eligibility criteria for the grant'),
    //   //         applicationUrl: z
    //   //           .string()
    //   //           .describe(
    //   //             'The URL to apply or get more information about the grant'
    //   //           )
    //   //       })
    //   //     )
    //   //   }),
    //   //   generate: async function* ({ grants }) {
    //   //     // Display loading state with Tailwind styling
    //   //     yield (
    //   //       <div className="flex justify-center items-center h-48">
    //   //         <p className="text-lg font-semibold text-gray-500">
    //   //           Loading grant information...
    //   //         </p>
    //   //       </div>
    //   //     )

    //   //     // Simulate a delay (e.g., fetching from an API)
    //   //     await new Promise(resolve => setTimeout(resolve, 1000))

    //   //     const toolCallId = nanoid()

    //   //     // Hardcoded grant data with internal links
    //   //     const grantList = [
    //   //       {
    //   //         name: 'SNAP',
    //   //         description:
    //   //           'Supplemental Nutrition Assistance Program provides food-purchasing assistance for low- and no-income people.',
    //   //         eligibility: 'Low-income individuals and families',
    //   //         applicationUrl: 'internal_link.com/snap'
    //   //       },
    //   //       {
    //   //         name: 'WIC',
    //   //         description:
    //   //           'Women, Infants, and Children program provides assistance to pregnant women, new mothers, and children under 5.',
    //   //         eligibility:
    //   //           'Pregnant women, breastfeeding mothers, and children under 5 from low-income households',
    //   //         applicationUrl: 'internal_link.com/wic'
    //   //       },
    //   //       {
    //   //         name: 'Lifeline',
    //   //         description:
    //   //           'Lifeline provides discounted phone and internet services for low-income households.',
    //   //         eligibility: 'Low-income individuals',
    //   //         applicationUrl: 'internal_link.com/lifeline'
    //   //       }
    //   //     ]

    //   //     // Update the AI state with the grant information
    //   //     aiState.done({
    //   //       ...aiState.get(),
    //   //       messages: [
    //   //         ...aiState.get().messages,
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'assistant',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-call',
    //   //               toolName: 'getGrants',
    //   //               toolCallId,
    //   //               args: { grants: grantList }
    //   //             }
    //   //           ]
    //   //         },
    //   //         {
    //   //           id: nanoid(),
    //   //           role: 'tool',
    //   //           content: [
    //   //             {
    //   //               type: 'tool-result',
    //   //               toolName: 'getGrants',
    //   //               toolCallId,
    //   //               result: grantList
    //   //             }
    //   //           ]
    //   //         }
    //   //       ]
    //   //     })

    //   //     // Render the grant information with Tailwind CSS for good UI
    //   //     return (
    //   //       <div className="max-w-4xl mx-auto p-4">
    //   //         <h2 className="text-2xl font-bold text-gray-800 mb-4">
    //   //           Available Grants
    //   //         </h2>
    //   //         <div className="grid gap-6">
    //   //           {grantList.map(grant => (
    //   //             <div
    //   //               key={grant.name}
    //   //               className="p-6 border border-gray-200 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
    //   //             >
    //   //               <h3 className="text-xl font-semibold text-gray-900">
    //   //                 {grant.name}
    //   //               </h3>
    //   //               <p className="text-gray-700 mt-2">{grant.description}</p>
    //   //               <p className="text-gray-600 mt-1">
    //   //                 <strong>Eligibility:</strong> {grant.eligibility}
    //   //               </p>
    //   //               <a
    //   //                 href={grant.applicationUrl}
    //   //                 target="_blank"
    //   //                 rel="noopener noreferrer"
    //   //                 className="inline-block mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors duration-300"
    //   //               >
    //   //                 Apply Here
    //   //               </a>
    //   //             </div>
    //   //           ))}
    //   //         </div>
    //   //       </div>
    //   //     )
    //   //   }
    //   // }
    // }
  })

  return {
    id: nanoid(),
    display: result.value
  }
}

export type AIState = {
  chatId: string
  messages: Message[]
}

export type UIState = {
  id: string
  display: React.ReactNode
}[]

export const AI = createAI<AIState, UIState>({
  actions: {
    submitUserMessage,
    confirmPurchase
  },
  initialUIState: [],
  initialAIState: { chatId: nanoid(), messages: [] },
  onGetUIState: async () => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const aiState = getAIState() as Chat

      if (aiState) {
        const uiState = getUIStateFromAIState(aiState)
        return uiState
      }
    } else {
      return
    }
  },
  onSetAIState: async ({ state }) => {
    'use server'

    const session = await auth()

    if (session && session.user) {
      const { chatId, messages } = state

      const createdAt = new Date()
      const userId = session.user.id as string
      const path = `/chat/${chatId}`

      const firstMessageContent = messages[0].content as string
      const title = firstMessageContent.substring(0, 100)

      const chat: Chat = {
        id: chatId,
        title,
        userId,
        createdAt,
        messages,
        path
      }

      await saveChat(chat)
    } else {
      return
    }
  }
})

export const getUIStateFromAIState = (aiState: Chat) => {
  return aiState.messages
    .filter(message => message.role !== 'system')
    .map((message, index) => ({
      id: `${aiState.chatId}-${index}`,
      display:
        message.role === 'tool' ? (
          message.content.map(tool => {
            return tool.toolName === 'listStocks' ? (
              <BotCard>
                {/* TODO: Infer types based on the tool result*/}
                {/* @ts-expect-error */}
                <Stocks props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPrice' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Stock props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'showStockPurchase' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Purchase props={tool.result} />
              </BotCard>
            ) : tool.toolName === 'getEvents' ? (
              <BotCard>
                {/* @ts-expect-error */}
                <Events props={tool.result} />
              </BotCard>
            ) : null
          })
        ) : message.role === 'user' ? (
          <UserMessage>{message.content as string}</UserMessage>
        ) : message.role === 'assistant' &&
          typeof message.content === 'string' ? (
          <BotMessage content={message.content} />
        ) : null
    }))
}
