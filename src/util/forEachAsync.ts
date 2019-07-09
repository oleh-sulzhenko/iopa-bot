export const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

export const asyncForEachIfTrue = async (array, callback) => {
  let shouldContinue: boolean = false
  for (let index = 0; index < array.length; index++) {
    shouldContinue = await callback(array[index], index, array)
    if (!shouldContinue) break
  }
  return shouldContinue
}
